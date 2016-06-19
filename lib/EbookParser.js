const path = require('path');

const pdbParser = require('./parsers/PdbParser');

var parseFile = function (file, cb) {
	if (!cb) {
		return;
	}
	if (!file) {
		return cb('No file argument given');
	}
	
	switch (path.extname(file)) {
		case '.pdb':
			pdbParser.parseFile(file, (err, pdbFile) => {
				if (err) {
					return cb(err);
				}
				
				return cb(null, pdbFile);
			});

			break;
		default:
			return cb('File "' + file + '" is of an unknown file type (' + path.extname(file) + ')');
	}
};

module.exports.parse = module.exports.parseFile = parseFile;