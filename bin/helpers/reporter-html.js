let templatesDir = path.join('..', 'templates');

function loadFile(fileName) {
  return fs.readFileSync(fileName, 'utf8');
}

function loadInlineCss() {
  loadFile(path.join(templatesDir, 'assets', 'browserstack-cypress-report.css'));
}

renderReportHTML = (props) => {
  let metaCharSet = `<meta charset="utf-8">`;
  let metaViewPort = `<meta name="viewport" content="width=device-width, initial-scale=1"> `;
  let pageTitle = `<title> Browserstack Cypress Report </title>`;
  let jQueryScriptTag = `<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>`;
  let inlineCss = loadInlineCss();
  let head = `<head> ${metaCharSet} ${metaViewPort} ${pageTitle} ${jQueryScriptTag} ${inlineCss} </head>`;
  let htmlOpenTag = `<!DOCTYPE HTML><html>`;
  let htmlClosetag = `</html>`;
  let body = ``;
  let html = `${htmlOpenTag} ${head} ${body} ${htmlClosetag}`;

  return html;
}

exports.module = renderReportHTML;
