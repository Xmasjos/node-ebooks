const fs = require('fs');
const path = require('path');

const logLocation = '@EbookParser.parsers.PdbParser';

const defaultStringType = 'utf8';

/**
 *
 */
function getBytes(buffer, offset, byteCount) {
	var bytes = '';
	
	for (var i = offset; i < offset + byteCount; i++) {
		bytes += buffer[i];
	}
	
	return bytes;
}

function getByteArray(buffer, offset, byteCount) {
	var bytes = [];
	
	for (var i = offset; i < offset + byteCount; i++) {
		bytes.push(buffer[i]);
	}
	
	return bytes;
}

function getString(buffer, type, offset, byteCount) {
	return buffer.toString(type, offset, offset + byteCount);
}

function parseDate(data, unix) {
	var baseDate;
	if (unix) {
		baseDate = Date.UTC(1970, 1, 1);
	} else {
		baseDate = Date.UTC(1904, 1, 1); // is a minus value
	}
	
	var dataMiliseconds = data * 1000; // Data is in seconds, value in miliseconds
	var dateValue = baseDate + dataMiliseconds;
	
	return new Date(dateValue);
}

/**
 * parseDate parses the given data (in pdb-date format) to a js Date object.
 *
 * @param <Number> data the number to parse a date from
 * @returns <Date> the parsed js Date, or null if it can't be parsed
 */
function getDate(buffer, offset) {
	if (!buffer) {
		return null;
	}
	
	offset = offset || 0;
		
	/*
	The original PDB format used times counting in seconds from 1st January, 1904.
	This is the base time used by the original Mac OS, and there were close links between Palm OS and Mac OS.
	Using an unsigned 32-bit integer this will overflow sometime in 2040.
	
	However, the PDB tool written for Perl says that the time should be counted from 1st January 1970 (the Unix base time), and uses a signed 32-bit integer which will overflow sometime in 2038.
	*/
	// Min date = 1996, start of PalmOS
	// Max date = now
	// LE is more probable, so try that first
	var minDate = Date.UTC(1996, 1, 1);
	var maxDate = Date.now();
	
	var dataUIntLE = buffer.readUInt32LE(offset);
	var dateUIntLE = parseDate(dataUIntLE);
	
	if (dateUIntLE > minDate && dateUIntLE < maxDate) {
		return dateUIntLE;
	}
	
	var dataIntLE = buffer.readInt32LE(offset);
	var dateIntLE = parseDate(dataIntLE);

	if (dateIntLE > minDate && dateIntLE < maxDate) {
		return dateIntLE;
	}
	
	var dataUIntBE = buffer.readUInt32BE(offset);
	var dateUIntBE = parseDate(dataUIntBE);
	
	if (dateUIntBE > minDate && dateUIntBE < maxDate) {
		return dateUIntBE;
	}
	
	var dataIntBE = buffer.readInt32BE(offset);
	var dateIntBE = parseDate(dataIntBE);
	
	if (dateIntBE > minDate && dateIntBE < maxDate) {
		return dateIntBE;
	}
	
	return null;
}

var PdbFile = function (fileBuffer) {
	if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
		return null; 
	}
	
	var me = this;
	
	// http://wiki.mobileread.com/wiki/PDB
	me.format = {
		ext: 'pdb',
		name: 'Palm database'
	};
	
	me.buffer = fileBuffer;
	me.fileName = getString(fileBuffer, defaultStringType, 0, 32); // ascii ?
	me.attributes = getBytes(fileBuffer, 32, 2);
	me.version = getBytes(fileBuffer, 34, 2);
	me.modificationNumber = getBytes(fileBuffer, 48, 4);
	me.recordCount = getBytes(fileBuffer, 76, 2);
	me.recordInfos = [];
	
	// TODO: Move to base class
	// TODO: Fix relative to file size (B, KB, MB, GB etc)
	me.fileSize = Math.round(fileBuffer.length / 1024); // File size in KB

	me.createdOn = getDate(fileBuffer, 36);
	me.updatedOn = getDate(fileBuffer, 40);
	me.lastBackupDate = getDate(fileBuffer, 44);
	
	me.additionalData = {
		appInfoId: getString(fileBuffer, 'hex', 52, 4),
		sortInfoId: getString(fileBuffer, 'hex', 56, 4),
		type: getString(fileBuffer, defaultStringType, 60, 4),
		creator: getString(fileBuffer, defaultStringType, 64, 4),
		uniqueIDSeed: getString(fileBuffer, 'hex', 68, 4),
		nextRecordListID = getBytes(fileBuffer, 72, 4)
	};

	// Base offset = 78 + recordCount * 8
	var offset = 78;
	
	//TODO: Make sure the array is ordered by recordInfo.id
	for (var i = 0; i <= me.recordCount; i++) {
		//1-4 => data offset from start of pdb file
		//5   => record attributes (bit)
		//6-8 => unique record id (mostly record #)
		var recordInfo = {};
		
		//TODO: Check offsetType => int | hex | byte etc
		recordInfo.offset = fileBuffer.readIntBE(offset, 4);//getBytes(fileBuffer, offset, 4);
		recordInfo.offsetBytes = getByteArray(fileBuffer, offset, 4);
		offset += 4;
		
		recordInfo.attributes = getBytes(fileBuffer, offset, 1); // Split in bits
		recordInfo.attributesBytes = getByteArray(fileBuffer, offset, 4);
		offset += 1;
		
		var recordIdHex = getString(fileBuffer, 'hex', offset, 3);
		if (parseInt(recordIdHex) == 0) {
			recordInfo.id = i;
		} else {
			recordInfo.id = getBytes(fileBuffer, offset, 3);
		}
		recordInfo.idBytes = getByteArray(fileBuffer, offset, 3);
		
		offset += 3;
		
		me.recordInfos.push(recordInfo);
	}
	
	me.lastOffset = offset;
	
	me.metaDataBytes = getByteArray(fileBuffer, 0, 77);
	me.inBetweenBytes = getByteArray(fileBuffer, offset, me.recordInfos[0].offset - 1);
	
	me.getRecordBuffer = function (recordIndex) {
		if (recordIndex >= me.recordInfos.length) {
			return null;
		}
		
		//console.log('retrieving index', recordIndex);
		var recordInfo = me.recordInfos[recordIndex];
		
		//console.log('retrieving info', recordInfo);
		var toByteIndex;
		
		if (recordIndex + 1 >= me.recordInfos.length) {
			toByteIndex = me.buffer.length - 1;
		} else {
			var nextInfo = me.recordInfos[recordIndex + 1];
			toByteIndex = nextInfo.offset - 1;
		}
		
		var byteCount = toByteIndex - recordInfo.offset;
		//console.log('offset', recordInfo.offset, '- toIndex', toByteIndex, '- byteCount', byteCount);
		var recordBuffer = new Buffer(toByteIndex - recordInfo.offset);
		
		fileBuffer.copy(recordBuffer, 0, recordInfo.offset, toByteIndex);
		//console.log('recBuffer', recordBuffer);
		return recordBuffer;
	};
	
	me.toJson = function () {
		var jsonObj = {
			format: me.format,
			//buffer: me.buffer
			fileName: me.fileName,
			attributes: me.attributes,
			version: me.version,
			modificationNumber: me.modificationNumber,
			recordCount: me.recordCount,
			recordInfos: me.recordInfos,
			
			lastOffset: me.lastOffset,
		};
	};
	
	return me;
};

var readPdbFile = function (file, cb) {
	if (!file) {
		if (cb)
			return cb(logLocation + '.readPdbFile: File name empty');
		return;
	}
	if (path.extname(file) !== '.pdb') {
		if (cb)
			return cb(logLocation + '.readPdbFile: File not a pdb file');
		return;
	}
	
	fs.readFile(file, (err, buffer) => {
		if (err) {
			if (cb)
				return cb(err);
			return;
		}
		
		var pdbFile = new PdbFile(buffer);
		
		return cb(null, pdbFile);
	});
};

module.exports.PdbFile = PdbFile;
module.exports.readFile = module.exports.readPdbFile = module.exports.parse = module.exports.parseFile = module.exports.parsePdbFile = readPdbFile;