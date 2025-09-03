# nanobananaphotoshop
Nano Banana — AI Script for Photoshop
.# Arabian AI School — Photoshop Nano Banana Script

**A Photoshop script that sends a selected region to Nano Banana (Gemini 2.5 Flash) via OpenRouter and places the generated result back into the document as a new layer.**

This project is maintained by **Arabian AI School / مدرسة الذكاء الاصطناعي**  
YouTube tutorial : https://youtu.be/VEiRF1CjyEQ
---

## What this script does
- Exports your current Photoshop selection as an image.
- Sends the image and your prompt to **OpenRouter** using the **Nano Banana (Gemini 2.5 Flash)** model.
- Downloads the generated result and inserts it as a new layer in your document (maintains position, and can be scaled to match the selection).
- Provides an in-dialog button to open the Arabian AI School YouTube channel.

This tool is intended to speed up creative edits and exploration inside Photoshop using modern image generation models.

---

## Features
- Selection-based editing (work on only the part of the image you choose).
- Simple prompt input inside Photoshop.
- Results appear as a new layer so you can blend and refine them using all Photoshop tools.
- Cross-platform compatible with Windows and macOS (requires `curl` available on the system).
- Local storage of your OpenRouter API key (stored in user preferences).

---

## Requirements
- Adobe Photoshop (Windows 10/11 or macOS).
- `curl` available in PATH (Windows: curl.exe via CMD; macOS: built-in).
- An OpenRouter account and an API key (Bearer token).

---

## Installation
1. Copy the script file `FluxKontext-OpenRouter.jsx` (or the filename you prefer) into Photoshop's Scripts folder:
   - Windows: `C:\Program Files\Adobe\Adobe Photoshop <version>\Presets\Scripts\`
   - macOS: `/Applications/Adobe Photoshop <version>/Presets/Scripts/`
2. Restart Photoshop.
3. Run the script from: `File > Scripts > <Script name>`.

---

## Setup (OpenRouter API Key)
1. Create an account at https://openrouter.ai/ and create an API key (Bearer token).
2. Run the script. The dialog will ask you to paste your OpenRouter API key. The key will be stored locally in your user preferences folder.
3. Use the **Settings** button in the script dialog to update the key later.

---

## Quick Usage
1. Open an image and make a selection.
2. Run the script and enter a descriptive prompt (e.g., "Replace selection with a glossy ceramic tile finish").
3. Click **Generate**. The result will either open as a new document or be placed as a new layer (depending on the dialog option).

---

## Troubleshooting
- **Invalid input (400)**: Verify your OpenRouter API key and ensure your prompt is a valid string. Try a small selection first.
- **Large base64 payload / timeouts**: Use smaller selections or upload the image to an external URL and modify the script to send the URL instead of base64.
- **Windows command windows briefly appearing**: Normal behavior when the script invokes `curl.exe` from CMD.

If you run into problems, open an issue with a short log or screenshot and your system details.

---

## License & Attribution
This project is licensed under **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)**.

Short summary:
- You may use and modify the script for **personal / non-commercial** purposes.
- **You must give attribution** to:  
  `Arabian AI School / مدرسة الذكاء الاصطناعي — https://www.youtube.com/@ArabianAiSchool`
- **Commercial use is prohibited** without written permission.

Full license text: https://creativecommons.org/licenses/by-nc/4.0/legalcode

Suggested attribution line (use when publishing images or sharing this project):
> Created with a Photoshop script by Arabian AI School / مدرسة الذكاء الاصطناعي — https://www.youtube.com/@ArabianAiSchool

---

## Contributing
Contributions (bug reports, small fixes, translations) are welcome. Please:
1. Open an issue describing the problem or feature idea.
2. Fork the repository and submit a PR.
3. Keep attribution intact in your changes.

---

## Credits
- Script original author (if any): see file header comments.
- Modified & maintained by **Arabian AI School / مدرسة الذكاء الاصطناعي**.

