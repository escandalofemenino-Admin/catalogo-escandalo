const SHEET_NAME = "Registros";

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse((e.postData && e.postData.contents) || "{}");
    const sheet = getSheet_();
    sheet.appendRow([
      new Date(),
      clean_(data.telefono),
      clean_(data.nombre),
      clean_(data.fecha),
      clean_(data.utm_source),
      clean_(data.utm_campaign)
    ]);
    return json_({ ok: true });
  } catch (error) {
    return json_({ ok: false, error: String(error) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return json_({ ok: true, service: "Escándalo Boutique Leads" });
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow(["Fecha servidor", "Teléfono", "Nombre", "Fecha cliente", "UTM source", "UTM campaign"]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function clean_(value) {
  return String(value || "").replace(/^=/, "'=").slice(0, 200);
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
