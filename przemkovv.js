const cli = require('cli'),
    fs = require('fs'),
    histogram = require('histogram'),
    fivarype = require('file-type'),
    readChunk = require('read-chunk'),
    sizeOf = require('image-size'),
    ChartjsNode = require('chartjs-node');


var options = cli.parse({ file: ['d', 'A directory with images.', 'dir'] });
var dirName = options.file.substr(-1) === '/' ? options.file : options.file + '/';
fs.readdir(dirName, createImageFilesList);


// method to filter files other than images
function createImageFilesList(err, fileNames) {
    var imageFiles = [];
    fileNames.forEach(function(fileName){
        var buffer = readChunk.sync(dirName + fileName, 0, 4100);
        var fivarypeVal = fivarype(buffer);
        if ( (fivarypeVal !== null) && (checkIfImage(fivarypeVal)) ) {
            imageFiles.push(fileName);
        }
    });

    var descriptionList = processFiles(dirName, imageFiles);
    fs.writeFile(dirName + 'output.json', JSON.stringify(descriptionList), function(err){
        if (err) throw err;
        cli.output("\nAll images has been processed. \nThe output file generated: " + dirName + "output.json\n\n");
    });
}

// loop through the files, perform actions for each file
function processFiles(dir, fileList) {
    var descriptionList = [];

    // progress bar
    cli.progress(0);
    var j = 0;

    fileList.forEach(function(fileName){
        histogram(dir + fileName || Buffer, function (err, data) {
            cli.progress(++j / fileList.length);
            // if image file has more than 256 colors, need to be ignored, cuz we are operating in grayscale
            if (data.colors.rgba <= 256){

                // we can use any of RGB colors cuz they are the same
                var histogramValues = data.red;
                var dimensions = sizeOf(dir + fileName);

                // histogram values need to be normalized cuz depend on image size
                var numberOfPixels = dimensions.width * dimensions.height;
                for (var i = 0; i < histogramValues.length; i++) { histogramValues[i] /= numberOfPixels; }

                // chart generation
                generateChartFromImage(histogramValues, fileName, dir);

                // phase detection
                var phase = phaseDetection(histogramValues);

                // create Description object and put it into array
                descriptionList.push(new EyeFileDescription(dir, fileName, null, phase, histogramValues, [dimensions.width, dimensions.height]));
            }
        });
    });

    return descriptionList;
}

function phaseDetection() {
    return null;
}

// structure to keep file data
function EyeFileDescription(dirName, fileName, side, phase, histogram, imageSize) {
    this.dir = dirName;
    this.name = fileName;
    this.side = side;
    this.phase = phase;
    this.histogram = histogram;
    this.size = imageSize;
}


// function to check if file type is allowed to be processed
function checkIfImage(fivarypeVal) {
    var allowedMimeTypes = ['image/jpeg'];
    return (allowedMimeTypes.indexOf(fivarypeVal.mime) !== -1);
}

function generateDataLabels(histogramValues) {
    var outputArray = [];
    var i = 0;
    histogramValues.forEach(() => {
        outputArray.push(String(i));
        i+=1;
    });

    return outputArray;
}


function generateChartFromImage(histogramValues, fileName, dirPath){

    var data = {
        labels: generateDataLabels(histogramValues),
        datasets: [
            {
                label: "Histogram values",
                fill: false,
                lineTension: 0.1,
                backgroundColor: "rgba(75,192,192,0.4)",
                borderColor: "rgba(75,192,192,1)",
                borderCapStyle: 'butt',
                borderDash: [],
                borderDashOffset: 0.0,
                borderJoinStyle: 'miter',
                pointBorderColor: "rgba(75,192,192,1)",
                pointBackgroundColor: "#fff",
                pointBorderWidth: 1,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: "rgba(75,192,192,1)",
                pointHoverBorderColor: "rgba(220,220,220,1)",
                pointHoverBorderWidth: 2,
                pointRadius: 1,
                pointHitRadius: 10,
                data: histogramValues,
                spanGaps: false,
            }
        ]
    };


    var chartJsOptions = {
        type: 'line',
        data: data,
        options: {
            title: {
                display: true,
                text: fileName
            }
        }
    };

    var chartNode = new ChartjsNode(1920, 1080);
    return chartNode.drawChart(chartJsOptions)
            .then(() => {
                return chartNode.getImageBuffer('image/png');
            })
            .then(buffer => {
                return chartNode.getImageStream('image/png');
            })
            .then(streamResult => {
                // write to a file
                return chartNode.writeImageToFile('image/png', dirPath + 'histogram_' + fileName + '.png');
            })
            .then(() => { });
}