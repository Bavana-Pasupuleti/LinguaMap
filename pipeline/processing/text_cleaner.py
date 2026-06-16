import re
import logging
from langdetect import detect, LangDetectException
import emoji

logger = logging.getLogger(__name__)

URL_PATTERN = re.compile(r'https?://\S+|www\.\S+')
MENTION_PATTERN = re.compile(r'@\w+')
SPECIAL_CHARS = re.compile(r'[^\w\s\'-]')
MULTI_SPACE = re.compile(r'\s+')

CONTRACTION_MAP = {
    "y'all": "you all",
    "ain't": "is not",
    "can't": "cannot",
    "couldn't": "could not",
    "didn't": "did not",
    "doesn't": "does not",
    "don't": "do not",
    "hadn't": "had not",
    "hasn't": "has not",
    "haven't": "have not",
    "he'd": "he would",
    "he'll": "he will",
    "he's": "he is",
    "i'd": "i would",
    "i'll": "i will",
    "i'm": "i am",
    "i've": "i have",
    "isn't": "is not",
    "it'd": "it would",
    "it'll": "it will",
    "it's": "it is",
    "let's": "let us",
    "mustn't": "must not",
    "shan't": "shall not",
    "she'd": "she would",
    "she'll": "she will",
    "she's": "she is",
    "shouldn't": "should not",
    "that's": "that is",
    "there's": "there is",
    "they'd": "they would",
    "they'll": "they will",
    "they're": "they are",
    "they've": "they have",
    "wasn't": "was not",
    "we'd": "we would",
    "we'll": "we will",
    "we're": "we are",
    "we've": "we have",
    "weren't": "were not",
    "what'll": "what will",
    "what's": "what is",
    "what've": "what have",
    "where's": "where is",
    "who'd": "who would",
    "who'll": "who will",
    "who's": "who is",
    "who've": "who have",
    "won't": "will not",
    "wouldn't": "would not",
    "you'd": "you would",
    "you'll": "you will",
    "you're": "you are",
    "you've": "you have",
    "gonna": "going to",
    "gotta": "got to",
    "wanna": "want to",
    "tryna": "trying to",
    "finna": "fixing to",
    "oughta": "ought to",
    "kinda": "kind of",
    "sorta": "sort of",
    "coulda": "could have",
    "shoulda": "should have",
    "woulda": "would have",
}


def extract_emojis(text):
    return [c for c in text if c in emoji.EMOJI_DATA]


def detect_language(text):
    try:
        return detect(text)
    except LangDetectException:
        return "unknown"


def clean_text(text, expand_contractions=True):
    original = text

    emojis = extract_emojis(text)
    lang = detect_language(text)

    text = URL_PATTERN.sub('', text)
    text = MENTION_PATTERN.sub('', text)

    if expand_contractions:
        for contraction, expansion in CONTRACTION_MAP.items():
            text = re.sub(re.escape(contraction), expansion, text, flags=re.IGNORECASE)

    text = SPECIAL_CHARS.sub(' ', text)
    text = MULTI_SPACE.sub(' ', text).strip()

    return {
        "cleaned": text,
        "original": original,
        "emojis": emojis,
        "language": lang,
        "word_count": len(text.split())
    }


def clean_batch(texts):
    results = []
    language_dist = {}

    for text in texts:
        result = clean_text(text)
        results.append(result)

        lang = result["language"]
        language_dist[lang] = language_dist.get(lang, 0) + 1

    english_results = [r for r in results if r["language"] == "en" or r["language"] == "unknown"]

    return {
        "cleaned": english_results,
        "all": results,
        "language_distribution": language_dist,
        "total": len(texts),
        "english_count": len(english_results),
        "filtered_count": len(texts) - len(english_results)
    }
