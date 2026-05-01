const fs = require("fs");
const path = require("path");

const appPath = "/opt/outline";
const languageOption = '{\n  label: "Русский (Russian)",\n  value: "ru_RU"\n}, ';
const minifiedLanguageOption = '{label:`Русский (Russian)`,value:`ru_RU`},';

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function write(filePath, contents) {
  fs.writeFileSync(filePath, contents);
}

function patchSharedI18n() {
  const filePath = path.join(appPath, "build/shared/i18n/index.js");
  let contents = read(filePath);

  if (contents.includes('value: "ru_RU"')) {
    return;
  }

  const marker = '{\n  label: "Español (Spanish)",\n  value: "es_ES"\n}';
  if (!contents.includes(marker)) {
    throw new Error(`Could not find language insertion point in ${filePath}`);
  }

  contents = contents.replace(marker, `${languageOption}${marker}`);
  write(filePath, contents);
}

function patchDateLocale() {
  const filePath = path.join(appPath, "build/shared/utils/date.js");
  let contents = read(filePath);

  if (contents.includes("ru_RU:")) {
    return;
  }

  const marker = "  pl_PL: _locale.pl,";
  if (!contents.includes(marker)) {
    throw new Error(`Could not find date locale insertion point in ${filePath}`);
  }

  contents = contents.replace(marker, `${marker}\n  ru_RU: _locale.ru,`);
  write(filePath, contents);
}

function patchFrontendBundle() {
  const assetsPath = path.join(appPath, "build/app/assets");
  const files = fs
    .readdirSync(assetsPath)
    .filter((fileName) => fileName.endsWith(".js"));
  let patched = false;

  for (const fileName of files) {
    const filePath = path.join(assetsPath, fileName);
    let contents = read(filePath);

    if (contents.includes("value:`ru_RU`")) {
      patched = true;
      continue;
    }

    const marker = "{label:`Español (Spanish)`,value:`es_ES`}";
    if (!contents.includes(marker)) {
      continue;
    }

    contents = contents.replace(marker, `${minifiedLanguageOption}${marker}`);
    write(filePath, contents);
    patched = true;
  }

  if (!patched) {
    throw new Error("Could not find frontend language bundle to patch");
  }
}

function verifyTranslation() {
  const filePath = path.join(
    appPath,
    "build/shared/i18n/locales/ru_RU/translation.json"
  );
  const translations = JSON.parse(read(filePath));

  if (!translations["New document"] || translations["New document"] === "New document") {
    throw new Error("Russian translation file was not copied correctly");
  }
}

patchSharedI18n();
patchDateLocale();
patchFrontendBundle();
verifyTranslation();

console.log("Russian locale patched into Outline image");
