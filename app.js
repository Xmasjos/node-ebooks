const fs = require('fs');

const ebookParser = require('./lib/EbookParser');

//TODO: Use better cli arguments!
if (process.argv.length < 2) {
	return console.log('No file given to parse');
}

var fileName = process.argv[2];

function writeToFile(data) {
	var jsonData = JSON.stringify(jsonData, null, 2);
	
	var outputFileName = './test-output.json';
	
	fs.writeFile(outputFilename, jsonData, function (err) {
		if (err) {
			console.log(err);
		} else {
			console.log("JSON saved to " + outputFilename);
		}
	}); 
}

ebookParser.parse(fileName, (err, file) => {
	if (err) {
		return console.log(err);
	}
	
	var fileJson = file;
	
	fileJson.buffer = null;
	fileJson.records = [];
	//TODO: Add bytes for all first item stuff
	
	console.log('Read file "' + fileName + '" (' + file.formatName + ')');
	if (file.version) {
		console.log('\tv' + file.version);
	}
	if (file.fileName) {
		console.log('\tInternal file name: ' + file.fileName);
	}
	console.log('\tSize: ' + file.fileSize + 'KB');
	console.log('\tRecord count: ' + file.recordCount);
	
	if (file.createdOn) {
		console.log('\tCreated on: ' + file.createdOn)
	}
	if (file.updatedOn) {
		console.log('\tUpdated on: ' + file.updatedOn);
	}
	
	if (file.recordInfos.length > 0) {
		var recordInfo = file.recordInfos[0];
		var secondRecordInfo = file.recordInfos[1];
		//var thirdRecordInfo = file.recordInfos[2];
		
		console.log('Info', recordInfo.id, recordInfo.offset, secondRecordInfo.offset - 1);
		console.log('Attributes: ' + recordInfo.attributes);
		
		var parseHelper = require('./lib/parsers/parseHelper');
		
		var recordBuffer = file.getRecordBuffer(0);
		
		var bytes = [];
		
		for (var value in recordBuffer.values()) {
			bytes.push(value);
		}
		
		fileJson.records[0].bytes = bytes;
		
		//var partStringBytes = parseHelper.buffer_getBytes(file.buffer, recordInfo.offset, recordInfo.offset + 500);
		//var partString = file.buffer.toString('binary', recordInfo.offset, recordInfo.offset + 500);
		
		//if (partStringBytes) {
		//	console.log(partStringBytes);
		//} else {
		//	console.log('No data');
		//}
		
		//parseHelper.buffer_logAllParses(file.buffer, recordInfo.offset, recordInfo.offset + 500);
		//console.log()
		
		//for (var i = recordInfo.offset; i < secondRecordInfo.offset - 1; i += 50) {
		//	var blaat = file.buffer.toString('ascii', i, i + 50);
		//	
		//	console.log(blaat);
		//}
		
		//console.log('Info', secondRecordInfo.id, secondRecordInfo.offset, thirdRecordInfo.offset - 1);
		//console.log('Attributes: ' + secondRecordInfo.attributes);
	}
	
	console.log();
	
	writeFile(fileJson);
});