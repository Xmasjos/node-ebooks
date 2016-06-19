const ebookParser = require('./lib/EbookParser');

//TODO: Use better cli arguments!
if (process.argv.length < 2) {
	return console.log('No file given to parse');
}

var fileName = process.argv[2];

ebookParser.parse(fileName, (err, file) => {
	if (err) {
		return console.log(err);
	}
	
	console.log('Read file "' + fileName + '" (' + file.formatName + ')');
	if (file.version) {
		console.log('\tv' + file.version);
	}
	if (file.fileName) {
		console.log('\tInternal file name: ' + file.fileName);
	}
	console.log('\tSize: ' + file.fileSize + 'KB');
	console.log('\tRecord count: ' + file.recordCount);
	
	console.log();
});