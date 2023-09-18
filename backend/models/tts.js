// models/tts.js

const textToSpeech = require('@google-cloud/text-to-speech');
const { Storage } = require('@google-cloud/storage');
const franc = require('franc-min');

const client = new textToSpeech.TextToSpeechClient();
const storage = new Storage();

async function generateAudio(text) {
    // Remove markdown tags from the text
    const cleanedText = text.replace(/[#*_-]/g, '');

    // Use only the first 200 characters for language detection
    const textForDetection = cleanedText.substring(0, 200);

    // Detect language using franc-min
    const detectedLang = franc(textForDetection);
    let languageCode = 'en-US';  // Default to English
    let voiceName = 'en-US-Neural2-I';  // Default voice name for English

    // Map detected language to Google Text-to-Speech language codes and voice names
    if (detectedLang === 'eng') {
        languageCode = 'en-US';
        voiceName = 'en-US-Neural2-I';
    } else if (detectedLang === 'deu') {
        languageCode = 'de-DE';
        voiceName = 'de-DE-Polyglot-1';
    }
    // Add more rules as needed

    // Generate speech audio
    const request = {
        input: { text: cleanedText },
        voice: { languageCode, name: voiceName },
        audioConfig: { audioEncoding: 'LINEAR16' },
    };

    const [response] = await client.synthesizeSpeech(request);
    const audio = response.audioContent;

    // Generate a unique filename for this audio with "tts-" prefix
    const filename = `tts-${Date.now()}.mp3`;

    // Create a GCS file reference within the "tts/" folder
    const bucketName = process.env.TTS_GCS_BUCKET_NAME;
    const file = storage.bucket(bucketName).file(`tts/${filename}`);

    // Upload the audio buffer to GCS
    await file.save(audio);

    // Generate a signed URL to the uploaded audio file
    const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 1000 * 60 * 5,  // The URL will be valid for 5 minutes
    });

    return url;
}

module.exports = { generateAudio };
