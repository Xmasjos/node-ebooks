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
	var bytes = [];;
	
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
	var pdbFile = {
		format:				'pdb',
		formatName:			'Palm database',
		buffer:				fileBuffer,
		fileName:			getString(fileBuffer, defaultStringType, 0, 32), // ascii ?
		attributes:			getBytes(fileBuffer, 32, 2),
		version:			getBytes(fileBuffer, 34, 2),
		modificationNumber:	getBytes(fileBuffer, 48, 4),
		
		recordCount:		getBytes(fileBuffer, 76, 2),
		recordInfos:		[],
	};
	
	// TODO: Move to base class
	// TODO: Fix relative to file size (B, KB, MB, GB etc)
	pdbFile.fileSize = Math.round(fileBuffer.length / 1024); // File size in KB

	pdbFile.createdOn = getDate(fileBuffer, 36);
	pdbFile.updatedOn = getDate(fileBuffer, 40);
	pdbFile.lastBackupDate = getDate(fileBuffer, 44);
	
	var appInfoId = getString(fileBuffer, 'hex', 52, 4); // 0?
	var sortInfoId = getString(fileBuffer, 'hex', 56, 4); // 0?
	var type = getString(fileBuffer, defaultStringType, 60, 4); // See table in wiki
	var creator = getString(fileBuffer, defaultStringType, 64, 4); // See table in wiki
	var uniqueIDSeed = getString(fileBuffer, 'hex', 68, 4); // 0?
	//var nextRecordListID = getBytes(fileBuffer, 72, 4); // => Always zero in stored files
	
	// Type = DATA || bibl
	console.log('Type: ' + type);
	console.log('Creator: ' + creator);

	// Base offset = 78 + recordCount * 8
	var offset = 78;
	
	//TODO: Make sure the array is ordered by recordInfo.id
	for (var i = 0; i <= pdbFile.recordCount; i++) {
		//4 => data offset from start of pdb file
		//1 => record attributes (bit)
		//3 => unique record id (mostly record #)
		var recordInfo = {};
		
		//TODO: Check offsetType => int | hex | byte etc
		recordInfo.offset = fileBuffer.readIntBE(offset, 4);//getBytes(fileBuffer, offset, 4);
		offset += 4;
		recordInfo.attributes = getBytes(fileBuffer, offset, 1); // Split in bits
		offset += 1;
		var recordIdHex = getString(fileBuffer, 'hex', offset, 3);
		if (parseInt(recordIdHex) == 0) {
			recordInfo.id = i;
		} else {
			recordInfo.id = getBytes(fileBuffer, offset, 3);
		}
		
		offset += 3;
		
		pdbFile.recordInfos.push(recordInfo);
	}
	
	pdbFile.lastOffset = offset;
	
	pdbFile.getRecordBuffer = function (recordIndex) {
		if (recordIndex >= pdbFile.recordInfos.length) {
			return null;
		}
		
		var recordInfo = pdbFile.recordInfos[recordIndex];
		
		var toByteIndex;
		
		if (recordIndex + 1 >= pdbFile.recordInfos.length) {
			toByteIndex = pdbFile.buffer.length - 1;
		} else {
			var nextInfo = pdbFile.recordInfos[recordIndex + 1];
			toByteIndex = nextInfo.offset - 1;
		}
		
		var byteCount = toByteIndex - recordInfo.offset;
		var recordBuffer = new Buffer(toByteIndex - recordInfo.offset);
		
		pdbFile.buffer.copy(recordBuffer, 0, recordInfo.offset, toByteIndex);
		
		return recordBuffer;
	};
	
	//pdbFile.toJson = function (cb) {
	//	
	//};
	
	// TODO: Fix toJson function!
	
	return pdbFile;
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
		
		var pdbFile = PdbFile(buffer);
		
		return cb(null, pdbFile);
	});
};

module.exports.PdbFile = PdbFile;
module.exports.readFile = module.exports.readPdbFile = module.exports.parse = module.exports.parseFile = module.exports.parsePdbFile = readPdbFile;