const fs = require('fs');

const ebookParser = require('./lib/EbookParser');

//TODO: Use better cli arguments!
if (process.argv.length < 2) {
	return console.log('No file given to parse');
}

var fileName = process.argv[2];
var outputFileName = process.argv[3];

function writeToFile(data) {
	var jsonData = JSON.stringify(data, null, 2);
	
	fs.writeFile(outputFileName, jsonData, function (err) {
		if (err) {
			console.log(err);
		} else {
			console.log("JSON saved to " + outputFileName);
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
	
	console.log('Read file "' + fileName + '" (' + file.format.name + ')');
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
		
		var recordBuffer = file.getRecordBuffer(0);
		
		var bytes = [];
		
		for (var bufferIx = 0; bufferIx < recordBuffer.length; bufferIx++) {
			bytes.push(recordBuffer[bufferIx]);
		}
		//for (var value in recordBuffer.values()) {
		//	bytes.push(value);
		//}
		
		fileJson.records.push({});
		
		fileJson.records[0].bytes = bytes;
	}
	
	console.log();
	
	if (outputFileName) {
		writeToFile(fileJson);
	} else {
		console.log(fileJson);
	}
});