const fs = require('fs');
const path = require('path');

const logLocation = '@EbookParser.parsers.PdbParser';

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

/**
 * parseDate parses the given data (in pdb-date format) to a js Date object.
 *
 * @param <byte[]> data the data to parse
 * @returns <Date> the parsed js Date, or null if it can't be parsed
 */
function parseDate(data) {
	if (!data) {
		return null;
	}
		
	/*
	The original PDB format used times counting in seconds from 1st January, 1904.
	This is the base time used by the original Mac OS, and there were close links between Palm OS and Mac OS.
	Using an unsigned 32-bit integer this will overflow sometime in 2040.
	
	However, the PDB tool written for Perl says that the time should be counted from 1st January 1970 (the Unix base time), and uses a signed 32-bit integer which will overflow sometime in 2038.
	This conflict is unfortunate, but there's a simple way to sort out what's been done in a file you are examining.
		If the time has the top bit set, it's an unsigned 32-bit number counting from 1st Jan 1904
		If the time has the top bit clear, it's a signed 32-bit number counting from 1st Jan 1970.
	
	This can be stated this with some confidence, as otherwise the time would be before 1972 or before 1970, depending on the interpretation and the PDB format wasn't around then.
	For either system, overflow will occur in around 30 years time. Hopefully by then everyone will be on some properly documented eBook standard.
	*/
	
	for (var i = 0; i < data.length; i++) {
		console.log('Date byte ' + i + ': ' + data[i]);
	}
	
	//Date.UTC(1904, 1, 1);
	
	
	
	return data;
}

var PdbFile = function (fileBuffer) {
	if (!fileBuffer) { // || ! of type buffer
		return null; 
	}
	
	var me = this;
	
	// http://wiki.mobileread.com/wiki/PDB
	var pdbFile = {
		format:				'pdb',
		formatName:			'Palm database',
		buffer:				fileBuffer,
		fileName:			fileBuffer.toString('utf8', 0, 32), // ascii ?
		attributes:			getBytes(fileBuffer, 32, 2),
		version:			getBytes(fileBuffer, 34, 2),
		modificationNumber:	getBytes(fileBuffer, 48, 4),
		
		recordCount:		getBytes(fileBuffer, 76, 2),
		recordInfos:		[],
	};
	
	// TODO: Move to base class
	// TODO: Fix relative to file size (B, KB, MB, GB etc)
	pdbFile.fileSize = Math.round(fileBuffer.length / 1024); // File size in KB
	
	var createdOn = getBytes(fileBuffer, 36, 4);
	var updatedOn = getBytes(fileBuffer, 40, 4);
	var lastBackupDate = getBytes(fileBuffer, 44, 4);
	
	pdbFile.createdOn = parseDate(createdOn);
	pdbFile.updatedOn = parseDate(updatedOn);
	pdbFile.lastBackupDate = parseDate(lastBackupDate);
	
	var appInfoId = getBytes(fileBuffer, 52, 4); // 0?
	var sortInfoId = getBytes(fileBuffer, 56, 4); // 0?
	var type = getBytes(fileBuffer, 60, 4); // See table in wiki
	var creator = getBytes(fileBuffer, 64, 4); // See table in wiki
	var uniqueIDSeed = getBytes(fileBuffer, 68, 4); // Zero?
	//var nextRecordListID = getBytes(fileBuffer, 72, 4); // => Always zero in stored files
	
	// Base offset = 78 + recordCount * 8
	var offset = 78;
		
	for (var i = 0; i <= pdbFile.recordCount; i++) {
		//4 => data offset from start of pdb file
		//1 => record attributes (bit)
		//3 => unique record id (mostly record #)
		var recordInfo = {};
		
		recordInfo.offset = getBytes(fileBuffer, offset, 4);
		offset += 4;
		recordInfo.attributes = getBytes(fileBuffer, offset, 1);
		offset += 1;
		recordInfo.id = getBytes(fileBuffer, offset, 3);
		offset += 3;
		
		pdbFile.recordInfos.push(recordInfo);
	}
	
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
	
	//if (!cb) {
	//	var buffer = fs.readFileSync(file);
	//
	//	return PdbFile(buffer);
	//}
	
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