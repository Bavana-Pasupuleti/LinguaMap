import logging
from collections import Counter
import spacy

logger = logging.getLogger(__name__)

nlp = None


def get_nlp():
    global nlp
    if nlp is None:
        nlp = spacy.load("en_core_web_sm", disable=["ner"])
    return nlp


CULTURAL_PRESERVE = {
    "y'all", "yall", "wicked", "jawn", "ope", "hella", "fixin", "bless",
    "reckon", "holler", "crawfish", "gumbo", "barbecue", "bbq", "tailgate",
    "howdy", "rodeo", "grits", "bourbon", "moonshine", "biscuit", "gravy",
    "cornbread", "sweetea", "fried", "catfish", "bluegrass", "honky",
    "tonk", "prairie", "ranch", "homestead", "folks", "kinfolk",
    "porch", "stoop", "bodega", "deli", "sub", "hoagie", "grinder",
    "pop", "soda", "coke", "bubbler", "sneakers", "tennis", "gymshoes",
    "toboggan", "beanie", "toque", "buggy", "cart", "basket",
    "firefly", "lightning", "pecan", "creek", "crick", "wash",
    "feeder", "kolache", "lutefisk", "pasty", "chowder", "lobster",
    "clambake", "potluck", "hotdish", "casserole", "luau", "aloha",
    "mahalo", "poke", "shaka",
}

STANDARD_STOPWORDS = {
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "need", "to", "of", "in",
    "for", "on", "with", "at", "by", "from", "as", "into", "through",
    "during", "before", "after", "above", "below", "between", "out", "off",
    "over", "under", "again", "further", "then", "once", "and", "but", "or",
    "nor", "not", "so", "yet", "both", "either", "neither", "each", "every",
    "all", "any", "few", "more", "most", "other", "some", "such", "no",
    "only", "own", "same", "than", "too", "very", "just", "because", "if",
    "when", "where", "how", "what", "which", "who", "whom", "this", "that",
    "these", "those", "it", "its", "he", "she", "they", "them", "his", "her",
    "their", "we", "us", "our", "you", "your", "i", "me", "my", "also",
    "about", "up", "there", "here", "while", "since", "until", "although",
    "though", "like", "just", "really", "get", "got", "going", "go", "thing",
    "think", "know", "make", "want", "look", "see", "come", "take", "good",
    "new", "say", "said", "tell", "give", "use", "try", "ask", "work",
    "call", "even", "back", "way", "day", "much", "still", "well", "now",
    "let", "put", "keep", "right", "people", "time", "year", "long",
    "great", "little", "old", "big", "high", "different", "small", "large",
    "next", "last", "first", "able", "http", "https", "www", "com",
    "deleted", "removed", "edit",
}


def is_valid_token(token_text, lemma):
    if len(lemma) < 2:
        return False
    if lemma in STANDARD_STOPWORDS and lemma not in CULTURAL_PRESERVE:
        return False
    if token_text.isdigit():
        return False
    return True


def tokenize_text(text):
    doc = get_nlp()(text.lower())
    tokens = []

    for token in doc:
        if token.is_punct or token.is_space:
            continue
        lemma = token.lemma_.lower().strip()
        if is_valid_token(token.text, lemma):
            tokens.append({
                "text": token.text,
                "lemma": lemma,
                "pos": token.pos_,
            })

    return tokens


def build_ngrams(tokens, n=2):
    lemmas = [t["lemma"] for t in tokens]
    ngrams = []
    for i in range(len(lemmas) - n + 1):
        ngram = " ".join(lemmas[i:i + n])
        ngrams.append(ngram)
    return ngrams


def tokenize_and_count(texts):
    all_tokens = []
    unigrams = Counter()
    bigrams = Counter()
    trigrams = Counter()
    pos_dist = Counter()

    for text in texts:
        tokens = tokenize_text(text)
        all_tokens.extend(tokens)

        for t in tokens:
            unigrams[t["lemma"]] += 1
            pos_dist[t["pos"]] += 1

        bgs = build_ngrams(tokens, 2)
        for bg in bgs:
            bigrams[bg] += 1

        tgs = build_ngrams(tokens, 3)
        for tg in tgs:
            trigrams[tg] += 1

    nouns = Counter({t["lemma"]: 1 for t in all_tokens if t["pos"] == "NOUN"})
    for t in all_tokens:
        if t["pos"] == "NOUN":
            nouns[t["lemma"]] += 1

    verbs = Counter({t["lemma"]: 1 for t in all_tokens if t["pos"] == "VERB"})
    for t in all_tokens:
        if t["pos"] == "VERB":
            verbs[t["lemma"]] += 1

    adjs = Counter({t["lemma"]: 1 for t in all_tokens if t["pos"] == "ADJ"})
    for t in all_tokens:
        if t["pos"] == "ADJ":
            adjs[t["lemma"]] += 1

    return {
        "tokens": all_tokens,
        "unigrams": unigrams,
        "bigrams": bigrams,
        "trigrams": trigrams,
        "pos_distribution": pos_dist,
        "nouns": nouns,
        "verbs": verbs,
        "adjectives": adjs,
        "total_tokens": len(all_tokens),
    }
