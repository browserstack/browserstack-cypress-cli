const fs = require('fs'),
      path = require('path'),
      { winstonLogger } = require('./logger');

let templatesDir = path.join(__dirname, '../', 'templates');

function loadInlineCss() {
  return loadFile(path.join(templatesDir, 'assets', 'browserstack-cypress-report.css'));
}

function loadFile(fileName) {
  return fs.readFileSync(fileName, 'utf8');
}

function createBodyBuildHeader(report_data){
  let projectNameSpan = `<span class='project-name'> ${report_data.project_name} </span>`;
  let buildNameSpan = `<span class='build-name'> ${report_data.build_name} </span>`;
  let buildMeta = `<div class='build-meta'> ${buildNameSpan} ${projectNameSpan} </div>`;
  let buildLink = `<div class='build-link'> <a href='${report_data.build_url}' rel='noreferrer noopener' target='_blank'> View on BrowserStack </a> </div>`;
  let buildHeader = `<div class='build-header'> ${buildMeta} ${buildLink} </div>`;
  return buildHeader;
}

function createBodyBuildTable(report_data) {
  let specs = Object.keys(report_data.rows),
      specRow = '',
      specSessions = '',
      sessionBlocks = '',
      specData,
      specNameSpan,
      specPathSpan,
      specStats,
      specStatsSpan,
      specMeta,
      sessionStatus,
      sessionClass,
      sessionStatusIcon,
      sessionLink;

  specs.forEach((specName) => {
    specData = report_data.rows[specName];

    specNameSpan = `<span class='spec-name'> ${specName} </span>`;
    specPathSpan = `<span class='spec-path'> ${specData.path} </span>`;

    specStats = buildSpecStats(specData.meta);
    specStatsSpan = `<span class='spec-stats ${specStats.cssClass}'> ${specStats.label} </span>`;

    specMeta = `<div class='spec-meta'> ${specNameSpan} ${specPathSpan} ${specStatsSpan} </div>`;
    sessionBlocks = '';
    specData.sessions.forEach((specSession) => {

      sessionStatus = specSession.status;
      sessionClass = sessionStatus === 'passed' ? 'session-passed' : 'session-failed';
      sessionStatusIcon = sessionStatus === 'passed' ? "&#10004; " : "&#x2717; ";

      sessionLink = `<a href="${specSession.link}" rel="noreferrer noopener" target="_blank"> ${sessionStatusIcon} ${specSession.name} </a>`;

      sessionDetail = `<div class="session-detail ${sessionClass}"> ${sessionLink} </div>`;
      sessionBlocks = `${sessionBlocks} ${sessionDetail}`;
    });
    specSessions = `<div class='spec-sessions'> ${sessionBlocks} </div>`;
    specRow = `${specRow} <div class='spec-row'> ${specMeta} ${specSessions} </div>`;
  });


  return `<div class='build-table'> ${specRow} </div>`;
}

function buildSpecStats(specMeta) {
  let failedSpecs = specMeta.failed,
      passedSpecs = specMeta.passed,
      totalSpecs = specMeta.total,
      specStats = {};

  if (failedSpecs) {
    specStats.label = `${failedSpecs}/${totalSpecs} FAILED`;
    specStats.cssClass = 'spec-stats-failed';
  } else {
    specStats.label = `${passedSpecs}/${totalSpecs} PASSED`;
    specStats.cssClass = 'spec-stats-passed';
  }

  return specStats;
}

renderReportHTML = (report_data) => {
  let metaCharSet = `<meta charset="utf-8">`;
  let metaViewPort = `<meta name="viewport" content="width=device-width, initial-scale=1"> `;
  let pageTitle = `<title> Browserstack Cypress Report </title>`;
  let inlineCss = `<style type="text/css"> ${loadInlineCss()} </style>`;
  let head = `<head> ${metaCharSet} ${metaViewPort} ${pageTitle} ${inlineCss} </head>`;
  let htmlOpenTag = `<!DOCTYPE HTML><html>`;
  let htmlClosetag = `</html>`;
  let bodyBuildHeader = createBodyBuildHeader(report_data);
  let bodyBuildTable = createBodyBuildTable(report_data);
  let bodyReporterContainer = `<div class='report-container'> ${bodyBuildHeader} ${bodyBuildTable} </div>`;
  let body = `<body> ${bodyReporterContainer} </body>`;
  let html = `${htmlOpenTag} ${head} ${body} ${htmlClosetag}`;

  fs.writeFileSync('browserstack-report.html', html, () => {
    if(err) {
      return winstonLogger(err);
    }
    winstonLogger("The file was saved!");
  });
}

exports.reporterHTML = renderReportHTML;
exports.loadInlineCss = loadInlineCss;
