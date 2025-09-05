/**
 * Script by ARABIAN AI SCHOOL Channel on YOUTUBE)
 * Photoshop ExtendScript (JSX)
 *
 * Changes:
 * - API calls with OpenRouter chat/completions calls
 * - Authorization header: Bearer <API_KEY>
 * - Flexible parsing for returned image: supports data:image base64 or an http(s) URL
 * - Patched for macOS compatibility (base64 commands).
 * - Improved error reporting to show debug messages directly in alerts.
 * - Updated model name to match current OpenRouter API specifications.
 * - Removed non-standard 'modalities' parameter from API payload.
 *
 * Author: BARAA MOHAMED / ARABIAN AI SCHOOL
 */

#target photoshop

// ===== CONFIGURATION =====
var CONFIG = {
    // API key is stored in environment variable / preferences
    API_KEY: getAPIKey(),

    // Model versions (OpenRouter model id)
    MODELS: {
        "Nano Banana (مجانا)": "google/gemini-2.5-flash-image-preview"
    },

    // Polling settings
    MAX_POLL_ATTEMPTS: 60,
    POLL_INTERVAL: 2 // seconds
};

// ===== API KEY MANAGEMENT =====

function getAPIKey() {
    var apiKey = loadAPIKey();

    if (!apiKey || apiKey.length < 10) {
        apiKey = promptForAPIKey();
        if (apiKey && apiKey.length > 10) {
            saveAPIKey(apiKey);
        }
    }

    return apiKey;
}

function getPreferencesFile() {
    var prefsFolder = new Folder(Folder.userData + "/FluxKontext");
    if (!prefsFolder.exists) {
        prefsFolder.create();
    }
    return new File(prefsFolder + "/preferences.json");
}

function saveAPIKey(apiKey) {
    try {
        var prefsFile = getPreferencesFile();
        prefsFile.open("w");
        prefsFile.write('{"apiKey":"' + apiKey + '"}');
        prefsFile.close();
        return true;
    } catch (e) {
        return false;
    }
}

function loadAPIKey() {
    try {
        var prefsFile = getPreferencesFile();
        if (prefsFile.exists) {
            prefsFile.open("r");
            var content = prefsFile.read();
            prefsFile.close();
            var match = content.match(/"apiKey"\s*:\s*"([^"]+)"/);
            if (match && match[1]) {
                return match[1];
            }
        }
    } catch (e) {}
    return null;
}

function promptForAPIKey(fromSettings) {
    var dialog = new Window("dialog", "OpenRouter API Key " + (fromSettings ? "Settings" : "Required"));
    dialog.orientation = "column";
    dialog.alignChildren = "fill";
    dialog.preferredSize.width = 520;
    dialog.margins = 15;
    dialog.spacing = 10;

    var instructionPanel = dialog.add("panel", undefined, fromSettings ? "Update API Key" : "First Time Setup");
    instructionPanel.alignChildren = "left";
    instructionPanel.margins = 10;

    instructionPanel.add("statictext", undefined, "1. Go to https://openrouter.ai and create an account.");
    instructionPanel.add("statictext", undefined, "2. Create or copy your API key (Bearer token).");
    instructionPanel.add("statictext", undefined, "3. Paste it below:");

    var apiKeyGroup = dialog.add("group");
    apiKeyGroup.add("statictext", undefined, "API Key:");
    var apiKeyInput = apiKeyGroup.add("edittext", undefined, "");
    apiKeyInput.characters = 60;

    if (fromSettings && CONFIG.API_KEY) {
        apiKeyInput.text = CONFIG.API_KEY;
        apiKeyInput.active = true;
        var maskedKey = CONFIG.API_KEY.substr(0, 8) + "..." + CONFIG.API_KEY.substr(-4);
        var currentKeyText = dialog.add("statictext", undefined, "Current key: " + maskedKey);
        try { currentKeyText.graphics.font = ScriptUI.newFont(currentKeyText.graphics.font.name, ScriptUI.FontStyle.ITALIC, 10); } catch (e) {}
    } else {
        apiKeyInput.active = true;
    }

    var privacyText = dialog.add("statictext", undefined, "Your API key is stored locally in your user preferences.");
    try { privacyText.graphics.font = ScriptUI.newFont(privacyText.graphics.font.name, ScriptUI.FontStyle.ITALIC, 10); } catch (e) {}

    var testButton = dialog.add("button", undefined, "Test API Key");

    var buttonGroup = dialog.add("group");
    buttonGroup.alignment = "center";
    var okButton = buttonGroup.add("button", undefined, fromSettings ? "Update" : "OK");
    var cancelButton = buttonGroup.add("button", undefined, "Cancel");

    var validKey = false;

    testButton.onClick = function () {
        var testKey = apiKeyInput.text;
        if (testKey.length < 10) {
            alert("Please enter an API key first");
            return;
        }
        testButton.text = "Testing...";
        if (testAPIKey(testKey)) {
            testButton.text = "Tested Successfully";
            validKey = true;
        } else {
            alert("Invalid API key. Please check you've copied the correct key from openrouter.ai.");
            testButton.text = "Test API Key";
            validKey = false;
        }
    };

    okButton.onClick = function () {
        if (apiKeyInput.text.length < 10) {
            if (fromSettings) {
                dialog.close(0);
            } else {
                alert("Please enter a valid API key");
            }
        } else {
            dialog.close(1);
        }
    };

    cancelButton.onClick = function () {
        dialog.close(0);
    };

    var result = dialog.show();

    if (result == 1) {
        return apiKeyInput.text;
    }
    return null;
}

function testAPIKey(apiKey) {
    try {
        var testFile = new File(Folder.temp + "/openrouter_api_test_" + new Date().getTime() + ".txt");
        var isWindows = $.os.indexOf("Windows") !== -1;
        var cmd;
        // We will attempt to fetch available models as a basic key check
        if (isWindows) {
            cmd = 'cmd.exe /c curl.exe -s -H "Authorization: Bearer ' + apiKey + '" "https://openrouter.ai/api/v1/models" > "' + testFile.fsName + '" 2>&1';
        } else {
            cmd = getCurlCommand(
                'curl -s -H "Authorization: Bearer ' + apiKey + '" "https://openrouter.ai/api/v1/models"',
                testFile.fsName
            );
        }
        app.system(cmd);

        if (testFile.exists) {
            testFile.open("r");
            var response = testFile.read();
            testFile.close();
            testFile.remove();
            // crude check: valid JSON or presence of "models" or "name"
            if (response && (response.indexOf("models") > -1 || response.indexOf("{") === 0 || response.indexOf("name") > -1)) {
                return true;
            }
        }
        return false;
    } catch (e) {
        return false;
    }
}

// ===== CROSS-PLATFORM HELPERS =====

function getCurlCommand(curlCmd, outputFile, isBinary) {
    var isWindows = $.os.indexOf("Windows") !== -1;
    if (isWindows) {
        curlCmd = curlCmd.replace(/^curl\s/, "curl.exe ");
        if (isBinary) {
            return 'cmd.exe /c ' + curlCmd + ' -o "' + outputFile + '"';
        } else {
            return 'cmd.exe /c ' + curlCmd + ' > "' + outputFile + '" 2>&1';
        }
    } else {
        if (isBinary) {
            return '/bin/sh -c \'' + curlCmd + ' -o "' + outputFile + '"\'';
        } else {
            return '/bin/sh -c \'' + curlCmd + ' > "' + outputFile + '" 2>&1\'';
        }
    }
}

function getBase64Command(inputFile, outputFile) {
    var isWindows = $.os.indexOf("Windows") !== -1;
    if (isWindows) {
        return 'cmd.exe /c certutil -encode "' + inputFile + '" "' + outputFile + '"';
    } else {
        return '/usr/bin/base64 < "' + inputFile + '" > "' + outputFile + '"';
    }
}

function openUrl(url) {
    try {
        var isWindows = ($.os.indexOf("Windows") !== -1);
        var isMac = ($.os.indexOf("Mac") !== -1 || $.os.indexOf("Macintosh") !== -1);
        if (isWindows) {
            app.system('cmd.exe /c start "" "' + url + '"');
        } else if (isMac) {
            app.system('/usr/bin/open "' + url + '"');
        } else {
            app.system('xdg-open "' + url + '"');
        }
    } catch (e) {
        alert("Could not open URL: " + url + "\n" + e.message);
    }
}

// ===== UNDO MANAGEMENT =====

function executeWithHistory(operationName, prompt, selectedModel, newDocument, upscale) {
    app.activeDocument.suspendHistory(operationName, "processSelection('" + prompt.replace(/'/g, "\\'") + "', '" + selectedModel + "', " + newDocument + ", " + upscale + ")");
}

// ===== MAIN FUNCTIONS =====

function main() {
    if (!CONFIG.API_KEY) {
        alert("No API key found. The script cannot continue without a valid OpenRouter API key.");
        return;
    }

    if (!app.documents.length) {
        alert("Please open an image in Photoshop first!");
        return;
    }

    if (!hasActiveSelection()) {
        alert("Please make a selection first using any selection tool!");
        return;
    }

    var dialog = createDialog();
    var result = dialog.show();

    if (result == 1) {
        var prompt = dialog.promptInput.text;
        var selectedModel = dialog.modelDropdown.selection.text;
        var newDocument = dialog.newDocCheckbox.value;
        var upscale = false;

        if (prompt.length > 0) {
            var operationName = "OpenRouter Generation: " + prompt.substring(0, 30);

            if (newDocument) {
                processSelection(prompt, selectedModel, newDocument, upscale);
            } else {
                executeWithHistory(operationName, prompt, selectedModel, newDocument, upscale);
            }
        } else {
            alert("Please enter a prompt first!");
        }
    }
}

function createDialog() {
    var dialog = new Window("dialog", "الأداة من تطوير قناة مدرسة الذكاء الاصطناعي");
    dialog.orientation = "column";
    dialog.alignChildren = "fill";
    dialog.preferredSize.width = 420;
    dialog.margins = 15;
    dialog.spacing = 10;

    var topRow = dialog.add("group");
    topRow.alignment = "fill";

    var modelGroup = topRow.add("group");
    modelGroup.alignment = "left";
    modelGroup.add("statictext", undefined, "Model:");
    var modelOptions = [];
    for (var k in CONFIG.MODELS) { if (CONFIG.MODELS.hasOwnProperty(k)) modelOptions.push(k); }
    dialog.modelDropdown = modelGroup.add("dropdownlist", undefined, modelOptions);
    dialog.modelDropdown.selection = 0;

    var settingsGroup = topRow.add("group");
    settingsGroup.alignment = "right";
    var settingsBtn = settingsGroup.add("button", undefined, "Settings");
    settingsBtn.preferredSize.width = 80;

    settingsBtn.onClick = function () {
        var newKey = promptForAPIKey(true);
        if (newKey && newKey.length > 10) {
            CONFIG.API_KEY = newKey;
            saveAPIKey(newKey);
            alert("API key updated successfully!");
        }
    };

    var promptGroup = dialog.add("panel", undefined, "Prompt:");
    promptGroup.alignChildren = "fill";
    promptGroup.margins = 10;
    dialog.promptInput = promptGroup.add("edittext", undefined, "");
    dialog.promptInput.characters = 50;
    dialog.promptInput.active = true;

    dialog.newDocCheckbox = dialog.add("checkbox", undefined, "Output to new document");
    dialog.newDocCheckbox.value = false;

    var subscribeGroup = dialog.add("group");
    subscribeGroup.orientation = "row";
    subscribeGroup.alignChildren = ["left","center"];
    subscribeGroup.spacing = 10;

    var subscribeText = subscribeGroup.add("statictext", undefined, "Subscribe to ARABIAN AI channel on YOUTUBE");
    try {
        subscribeText.graphics.font = ScriptUI.newFont(subscribeText.graphics.font.name, ScriptUI.FontStyle.SEMIBOLD, 11);
    } catch (e) {}

    var openBtn = subscribeGroup.add("button", undefined, "Open Channel");
    openBtn.onClick = function () {
        openUrl("https://www.youtube.com/@ArabianAiSchool");
    };

    var buttonGroup = dialog.add("group");
    buttonGroup.alignment = "center";
    var generateButton = buttonGroup.add("button", undefined, "Generate");
    var cancelButton = buttonGroup.add("button", undefined, "Cancel");

    generateButton.onClick = function () { dialog.close(1); };
    cancelButton.onClick = function () { dialog.close(0); };

    return dialog;
}

function hasActiveSelection() {
    try {
        var bounds = app.activeDocument.selection.bounds;
        return true;
    } catch (e) {
        return false;
    }
}

function processSelection(prompt, modelName, newDocument, upscale) {
    try {
        var doc = app.activeDocument;
        var modelId = CONFIG.MODELS[modelName];

        var savedSelection = doc.channels.add();
        savedSelection.name = "Flux Selection";
        doc.selection.store(savedSelection);

        var bounds = doc.selection.bounds;
        var x1 = Math.round(bounds[0].value);
        var y1 = Math.round(bounds[1].value);
        var x2 = Math.round(bounds[2].value);
        var y2 = Math.round(bounds[3].value);

        var tempFile = exportSelection(doc, x1, y1, x2, y2);
        if (!tempFile || !tempFile.exists) {
            alert("Could not export selection");
            savedSelection.remove();
            return;
        }

        var resultFile = callOpenRouterAPI(tempFile, prompt, modelId, upscale);

        tempFile.remove();

        if (resultFile && resultFile.exists) {
            if (newDocument) {
                app.open(resultFile);
            } else {
                placeResultInDocument(doc, resultFile, x1, y1, x2, y2, savedSelection, prompt);
            }
            resultFile.remove();
        } else {
            savedSelection.remove();
        }

    } catch (e) {
        alert("Processing error: " + e.message);
    }
}

function exportSelection(doc, x1, y1, x2, y2) {
    try {
        doc.selection.deselect();
        doc.artLayers.add();
        var tempLayer = doc.activeLayer;
        tempLayer.name = "Temp Merged";

        selectAll();
        copyMerged();
        doc.paste();

        var cropDoc = doc.duplicate("temp_crop", true);
        cropDoc.crop([x1, y1, x2, y2]);

        var timestamp = new Date().getTime();
        var tempFile = new File(Folder.temp + "/flux_input_" + timestamp + ".jpg");

        var saveOptions = new JPEGSaveOptions();
        saveOptions.quality = 10;
        cropDoc.saveAs(tempFile, saveOptions, true, Extension.LOWERCASE);

        cropDoc.close(SaveOptions.DONOTSAVECHANGES);

        doc.activeLayer = tempLayer;
        tempLayer.remove();

        return tempFile;

    } catch (e) {
        alert("Export error: " + e.message);
        return null;
    }
}

// ===== OpenRouter API integration =====

function callOpenRouterAPI(imageFile, prompt, modelId, upscale) {
    try {
        var base64File = new File(Folder.temp + "/openrouter_base64_" + new Date().getTime() + ".txt");
        var cmd = getBase64Command(imageFile.fsName, base64File.fsName);
        app.system(cmd);
        if (!base64File.exists) { alert("Could not convert image to base64"); return null; }

        base64File.open("r");
        var base64Data = base64File.read();
        base64File.close();

        if ($.os.indexOf("Windows") !== -1) {
            base64Data = base64Data.replace(/-----BEGIN CERTIFICATE-----/g, "");
            base64Data = base64Data.replace(/-----END CERTIFICATE-----/g, "");
        }
        base64Data = base64Data.replace(/[\r\n\s]/g, "");
        base64File.remove();

        var dataUrl = "data:image/jpeg;base64," + base64Data;

        var payloadFile = new File(Folder.temp + "/openrouter_payload_" + new Date().getTime() + ".json");
        payloadFile.open("w");

        var escPrompt = escapeJsonString(prompt);
        // UPDATED: Removed the non-standard 'modalities' parameter to align with official docs
        var payloadStr =
            '{' +
              '"model":"' + modelId + '",' +
              '"messages":[' +
                '{' +
                  '"role":"user",' +
                  '"content":[' +
                    '{ "type":"text", "text":"' + escPrompt + '" },' +
                    '{ "type":"image_url", "image_url":{ "url":"' + dataUrl + '" } }' +
                  ']' +
                '}' +
              ']' +
            '}';

        payloadFile.write(payloadStr);
        payloadFile.close();

        var responseFile = new File(Folder.temp + "/openrouter_response_" + new Date().getTime() + ".json");
        var curlCmd = getCurlCommand(
            'curl -s -X POST ' +
            '-H "Authorization: Bearer ' + CONFIG.API_KEY + '" ' +
            '-H "Content-Type: application/json" ' +
            '-d @"' + payloadFile.fsName + '" ' +
            '"https://openrouter.ai/api/v1/chat/completions"',
            responseFile.fsName
        );
        app.system(curlCmd);
        payloadFile.remove();

        if (!responseFile.exists) { alert("No response from OpenRouter"); return null; }

        responseFile.open("r");
        var response = responseFile.read();
        responseFile.close();
        responseFile.remove();

        var resultFile = downloadOpenRouterResult(response);
        if (resultFile) {
            if (upscale) return upscaleImage(resultFile);
            return resultFile;
        }

        var predictionId = extractPredictionId(response);
        if (predictionId) {
            var polledFile = pollForOpenRouterResult(predictionId);
            if (polledFile) {
                if (upscale) return upscaleImage(polledFile);
                return polledFile;
            }
        }

        alert("Could not extract image from OpenRouter response. Full debug details:\n\n" + response);
        return null;

    } catch (e) {
        alert("API error: " + e.message);
        return null;
    }
}

function extractPredictionId(response) {
    return null; // منع الـ polling — الاستجابة الأولى بتكون فيها الصورة
}

function pollForOpenRouterResult(predictionId) {
    var maxAttempts = CONFIG.MAX_POLL_ATTEMPTS;
    for (var i = 0; i < maxAttempts; i++) {
        $.sleep(CONFIG.POLL_INTERVAL * 1000);
        var statusFile = new File(Folder.temp + "/openrouter_status_" + new Date().getTime() + ".json");
        var curlCmd = getCurlCommand(
            'curl -s -H "Authorization: Bearer ' + CONFIG.API_KEY + '" ' +
            '"https://openrouter.ai/api/v1/chat/completions/' + predictionId + '"',
            statusFile.fsName
        );
        app.system(curlCmd);

        if (statusFile.exists) {
            statusFile.open("r");
            var response = statusFile.read();
            statusFile.close();
            statusFile.remove();

            if (response.indexOf('"status":"succeeded"') > -1 || response.indexOf('"status":"completed"') > -1) {
                var f = downloadOpenRouterResult(response);
                if (f) return f;
            } else if (response.indexOf('"status":"failed"') > -1) {
                alert("Prediction failed");
                return null;
            }
        }
    }
    alert("Timeout - please try again");
    return null;
}

function downloadOpenRouterResult(response) {
    try {
        var json = null;
        try { json = eval('(' + response + ')'); } catch (e) { json = null; }

        var imageUrl = null;

        if (json && json.choices && json.choices.length > 0) {
            var msg = json.choices[0].message;
            if (msg) {
                if (msg.images && msg.images.length > 0) {
                    var img = msg.images[0];
                    if (img) {
                        if (img.image_url && img.image_url.url) imageUrl = img.image_url.url;
                        else if (img.image_url) imageUrl = img.image_url;
                    }
                }
                if (!imageUrl && msg.content) {
                    if (typeof msg.content !== "string") {
                        try {
                            if (msg.content.image_url) imageUrl = msg.content.image_url;
                        } catch (e) {}
                    }
                    if (!imageUrl && typeof msg.content === "string") {
                        var contentStr = msg.content;
                        var dataUriRe = new RegExp("(data:image\\/[A-Za-z0-9+]+;base64,[A-Za-z0-9+\\/=]+)");
                        var m1 = dataUriRe.exec(contentStr);
                        if (m1 && m1[1]) {
                            imageUrl = m1[1];
                        } else {
                            var urlRe = new RegExp("https?:\\/\\/[^\"'\\s]+\\.(?:jpg|jpeg|png|webp)(?:\\?[^\"'\\s]*)?", "i");
                            var m2 = urlRe.exec(contentStr);
                            if (m2 && m2[0]) imageUrl = m2[0];
                        }
                    }
                }
            }
        }

        if (!imageUrl && typeof response === "string") {
            var dataUriRe2 = new RegExp("(data:image\\/[A-Za-z0-9+]+;base64,[A-Za-z0-9+\\/=]+)");
            var m3 = dataUriRe2.exec(response);
            if (m3 && m3[1]) {
                imageUrl = m3[1];
            } else {
                var urlRe2 = new RegExp("https?:\\/\\/[^\"']+\\.(?:jpg|jpeg|png|webp)(?:\\?[^\"'\\s]*)?", "i");
                var m4 = urlRe2.exec(response);
                if (m4 && m4[0]) imageUrl = m4[0];
            }
        }

        if (!imageUrl) {
            return null;
        }

        var timestamp = new Date().getTime();
        var resultFile = new File(Folder.temp + "/openrouter_result_" + timestamp + ".jpg");

        if (imageUrl.indexOf("data:image/") === 0) {
            var b64file = new File(Folder.temp + "/tmp_b64_" + timestamp + ".txt");
            b64file.open("w");
            b64file.write(imageUrl.replace(/^data:image\/[A-Za-z0-9+]+;base64,/, ""));
            b64file.close();

            if ($.os.indexOf("Windows") !== -1) {
                var decCmd = 'cmd.exe /c certutil -decode "' + b64file.fsName + '" "' + resultFile.fsName + '"';
                app.system(decCmd);
            } else {
                var decCmd = '/bin/sh -c \'/usr/bin/base64 -D -i "' + b64file.fsName + '" > "' + resultFile.fsName + '"\'';

                app.system(decCmd);
            }
            b64file.remove();
        } else {
            var curlCmd = getCurlCommand('curl -s -L --max-time 180 "' + imageUrl + '"', resultFile.fsName, true);
            app.system(curlCmd);
        }

        if (resultFile.exists && resultFile.length > 0) {
            return resultFile;
        }
        return null;

    } catch (e) {
        return null;
    }
}

// ===== Upscale logic (unchanged) =====

function upscaleImage(imageFile) {
    try {
        var originalSize = imageFile.length;
        var base64File = new File(Folder.temp + "/upscale_base64_" + new Date().getTime() + ".txt");
        var cmd = getBase64Command(imageFile.fsName, base64File.fsName);
        app.system(cmd);

        if (!base64File.exists) {
            return imageFile;
        }

        base64File.open("r");
        var base64Data = base64File.read();
        base64File.close();

        if ($.os.indexOf("Windows") !== -1) {
            base64Data = base64Data.replace(/-----BEGIN CERTIFICATE-----/g, "");
            base64Data = base64Data.replace(/-----END CERTIFICATE-----/g, "");
        }

        base64Data = base64Data.replace(/[\r\n\s]/g, "");
        base64File.remove();

        var dataUrl = "data:image/jpeg;base64," + base64Data;

        var payloadFile = new File(Folder.temp + "/upscale_payload_" + new Date().getTime() + ".json");
        payloadFile.open("w");
        var payload = '{"version":"f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa",' +
            '"input":{' +
            '"image":"' + dataUrl + '",' +
            '"scale":2,' +
            '"face_enhance":false' +
            '}}';
        payloadFile.write(payload);
        payloadFile.close();

        var responseFile = new File(Folder.temp + "/upscale_response_" + new Date().getTime() + ".json");
        var curlCmd = getCurlCommand(
            'curl -s --max-time 180 -X POST ' +
            '-H "Authorization: Bearer ' + CONFIG.API_KEY + '" ' +
            '-H "Content-Type: application/json" ' +
            '-d @"' + payloadFile.fsName + '" ' +
            '"https://api.replicate.com/v1/predictions"',
            responseFile.fsName
        );
        app.system(curlCmd);
        payloadFile.remove();

        if (responseFile.exists) {
            responseFile.open("r");
            var response = responseFile.read();
            responseFile.close();
            responseFile.remove();

            var predictionId = extractPredictionId(response);
            if (predictionId && response.indexOf('"status":"starting"') > -1) {
                var upscaledFile = pollForUpscaleResult(predictionId);
                if (upscaledFile && upscaledFile.exists && upscaledFile.length > originalSize) {
                    imageFile.remove();
                    return upscaledFile;
                }
            } else if (response.indexOf('"status":"succeeded"') > -1) {
                var upscaledFile = downloadOpenRouterResult(response);
                if (upscaledFile && upscaledFile.exists && upscaledFile.length > originalSize) {
                    imageFile.remove();
                    return upscaledFile;
                }
            }
        }
        return imageFile;

    } catch (e) {
        return imageFile;
    }
}

function pollForUpscaleResult(predictionId) {
    var maxAttempts = 30;
    for (var i = 0; i < maxAttempts; i++) {
        $.sleep(2000);
        var statusFile = new File(Folder.temp + "/upscale_status_" + new Date().getTime() + ".json");
        var curlCmd = getCurlCommand(
            'curl -s -H "Authorization: Bearer ' + CONFIG.API_KEY + '" ' +
            '"https://api.replicate.com/v1/predictions/' + predictionId + '"',
            statusFile.fsName
        );
        app.system(curlCmd);

        if (statusFile.exists) {
            statusFile.open("r");
            var response = statusFile.read();
            statusFile.close();
            statusFile.remove();

            if (response.indexOf('"status":"succeeded"') > -1) {
                return downloadOpenRouterResult(response);
            } else if (response.indexOf('"status":"failed"') > -1) {
                return null;
            }
        }
    }
    return null;
}

// ===== Placement into document (unchanged logic) =====

function placeResultInDocument(doc, resultFile, x1, y1, x2, y2, savedSelection, prompt) {
    try {
        var resultDoc = app.open(resultFile);

        resultDoc.artLayers[0].duplicate(doc, ElementPlacement.PLACEATBEGINNING);
        resultDoc.close(SaveOptions.DONOTSAVECHANGES);

        var newLayer = doc.artLayers[0];
        newLayer.name = "OpenRouter: " + prompt.substring(0, 30);

        var targetWidth = x2 - x1;
        var targetHeight = y2 - y1;

        var currentBounds = newLayer.bounds;
        var currentWidth = currentBounds[2].value - currentBounds[0].value;
        var currentHeight = currentBounds[3].value - currentBounds[1].value;

        if (Math.abs(currentWidth - targetWidth) > 1 || Math.abs(currentHeight - targetHeight) > 1) {
            var scaleX = (targetWidth / currentWidth) * 100;
            var scaleY = (targetHeight / currentHeight) * 100;
            var uniformScale = Math.min(scaleX, scaleY);
            newLayer.resize(uniformScale, uniformScale, AnchorPosition.TOPLEFT);
        }

        var finalBounds = newLayer.bounds;
        var finalWidth = finalBounds[2].value - finalBounds[0].value;
        var finalHeight = finalBounds[3].value - finalBounds[1].value;

        var centerX = x1 + (targetWidth / 2);
        var centerY = y1 + (targetHeight / 2);

        var currentCenterX = finalBounds[0].value + (finalWidth / 2);
        var currentCenterY = finalBounds[1].value + (finalHeight / 2);

        var dx = centerX - currentCenterX;
        var dy = centerY - currentCenterY;

        newLayer.translate(dx, dy);

        doc.selection.load(savedSelection);
        addLayerMask();
        doc.selection.deselect();

        savedSelection.remove();

    } catch (e) {
        alert("Placement error: " + e.message);
    }
}

// ===== HELPER FUNCTIONS (unchanged) =====

function selectAll() {
    app.activeDocument.selection.selectAll();
}

function copyMerged() {
    var idCpyM = charIDToTypeID("CpyM");
    executeAction(idCpyM, undefined, DialogModes.NO);
}

function addLayerMask() {
    try {
        var idMk = charIDToTypeID("Mk  ");
        var desc = new ActionDescriptor();
        var idNw = charIDToTypeID("Nw  ");
        var idChnl = charIDToTypeID("Chnl");
        desc.putClass(idNw, idChnl);
        var idAt = charIDToTypeID("At  ");
        var ref = new ActionReference();
        var idChnl2 = charIDToTypeID("Chnl");
        var idChnl3 = charIDToTypeID("Chnl");
        var idMsk = charIDToTypeID("Msk ");
        ref.putEnumerated(idChnl2, idChnl3, idMsk);
        desc.putReference(idAt, ref);
        var idUsng = charIDToTypeID("Usng");
        var idUsrM = charIDToTypeID("UsrM");
        var idRvlS = charIDToTypeID("RvlS");
        desc.putEnumerated(idUsng, idUsrM, idRvlS);
        executeAction(idMk, desc, DialogModes.NO);
    } catch (e) {}
}

function escapeJsonString(str) {
    return str.replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
}

// ===== START =====
main();
