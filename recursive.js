const fs = require('fs'),
    path = require('path');

function collectImagesDirs(dirName, cb) {
    let imagesDirs = [];

    function iterateFiles(filesNames, filesCb) {
        let leftFiles = filesNames.length;
        if(!leftFiles) filesCb(null, false);
        let onlyFiles = true;
        filesNames.forEach(fileName => {
            let filePath = path.join(dirName, fileName);
            if (fs.lstatSync(filePath).isDirectory()) {
                onlyFiles = false;
                collectImagesDirs(filePath, (e, l) => {
                    imagesDirs = imagesDirs.concat(l);
                    if (!--leftFiles) filesCb(null, onlyFiles);
                });
            } else {
                if (!--leftFiles) filesCb(null, onlyFiles);
            }
        });
    }

    fs.readdir(dirName, (err, filesNames) => {
        if (err) return cb(err);
        iterateFiles(filesNames, (err, onlyFiles) => {
            if (onlyFiles) {
                imagesDirs.push(dirName)
            }
            cb(null, imagesDirs);
        });
    });
}

module.exports = collectImagesDirs;