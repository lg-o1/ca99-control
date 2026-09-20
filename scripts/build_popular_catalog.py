#!/usr/bin/env python3
"""Classify 1000 downloaded MIDI songs into genre categories and build catalog.json."""
import json, os, shutil, re

SRC_DIR = os.path.join(os.path.dirname(__file__), '..', 'midi-collection')
INDEX = os.path.join(SRC_DIR, 'index.json')
MIDI_SRC = os.path.join(SRC_DIR, 'midi')
DEST = os.path.join(os.path.dirname(__file__), '..', 'app', 'midi-collection')

# Genre classification rules: (slug, emoji, label, keywords_regex)
CATEGORIES = [
    ('christmas', '🎄', 'Christmas', r'christmas|jingle|silent night|carol|santa|rudolph|frosty|snowman|deck the hall|nutcracker'),
    ('anime-game', '🎮', 'Anime / Game', r'naruto|zelda|undertale|minecraft|mario|genshin|demon slayer|attack on titan|pokemon|final fantasy|kirby|tetris|megalovania|sans|papyrus|flowey|deltarune|toby fox|one punch|hunter x|dragon ball|sailor moon|inuyasha|bleach|one piece|fairy tail|tokyo ghoul|death note|sword art|my hero|jojo|evangelion|cowboy bebop|studio ghibli|spirited away|howl|totoro|kiki|ponyo|mononoke|castle in the sky|among us|roblox|fortnite|cuphead|hollow knight|animal crossing|smash|sonic|chrono|kingdom hearts|persona|nier|ocarina|hyrule|korok|gerudo|lost woods|song of storms|great fairy|ballad of the wind|dearly beloved|simple and clean|hikari|unravel|cruel angel|baka mitai|yakuza|danganronpa|ace attorney|phoenix wright|omori|stardew|terraria|halo|doom|skyrim|witcher|dark souls|elden ring'),
    ('classical', '🎻', 'Classical', r'beethoven|mozart|chopin|bach|debussy|liszt|tchaikovsky|schubert|brahms|rachmaninoff|satie|schumann|vivaldi|handel|haydn|grieg|mendelssohn|ravel|prokofiev|dvorak|paganini|moonlight sonata|fur elise|turkish march|clair de lune|gymnopedie|arabesk|arabesque|nocturne op|prelude op|etude op|waltz op|ballade op|sonata.*movement|pathetique|tempest sonata|appassionata|waldstein|emperor concerto|ode to joy|spring.*vivaldi|winter.*vivaldi|canon in d|swan lake|nutcracker suite|claire de lune|liebestraum|hungarian rhapsody|flight of the bumblebee|ride of the valkyries|well.tempered|invention.*bach|toccata|fugue|fantaisie|impromptu|mazurka|polonaise|scherzo'),
    ('movie-tv', '🎬', 'Movie / TV', r'star wars|harry potter|pirates of the caribbean|interstellar|frozen|disney|let it go|lion king|aladdin|beauty and the beast|little mermaid|mulan|moana|coco|encanto|tangled|toy story|up.*pixar|wall.e|finding nemo|game of thrones|lord of the rings|hobbit|avengers|marvel|batman|superman|jurassic|schindler|titanic|inception|amelie|la la land|greatest showman|bohemian|phantom of the opera|les mis|hamilton|wicked|cats.*musical|rent.*musical|dear evan|wizard of oz|mary poppins|sound of music|west side story|grease|mamma mia|twilight|hunger games|divergent|maze runner|shrek'),
    ('kpop', '🇰🇷', 'K-Pop', r'\bbts\b|blackpink|twice|exo|stray kids|seventeen|txt\b|itzy|aespa|ive\b|new jeans|newjeans|le sserafim|red velvet|nct\b|ateez|enhypen|gidle|\bidle\b|mamamoo|monsta x|got7|bigbang|2ne1|shinee|super junior|tvxq|psy\b|gangnam'),
    ('rock', '🎸', 'Rock / Metal', r'queen|linkin park|nirvana|green day|imagine dragons|metallica|acdc|ac\/dc|led zeppelin|pink floyd|rolling stones|beatles|guns n roses|aerosmith|bon jovi|iron maiden|black sabbath|deep purple|van halen|def leppard|kiss\b|rush\b|the who|jimi hendrix|eric clapton|cream\b|foo fighters|radiohead|coldplay|muse\b|u2\b|oasis|blur\b|arctic monkeys|red hot chili|system of a down|rage against|tool\b|slipknot|rammstein|dream theater|megadeth|pantera|anthrax|slayer\b|judas priest|motorhead|ozzy|sabbath|bohemian rhapsody|stairway to heaven|hotel california|smells like teen|welcome to the jungle|enter sandman|thunderstruck|highway to hell|back in black|paranoid|smoke on the water|comfortably numb|wish you were here'),
    ('jazz-blues', '🎷', 'Jazz / Blues', r'jazz|blues|swing|bossa nova|duke ellington|miles davis|john coltrane|charlie parker|thelonious monk|bill evans|herbie hancock|chick corea|oscar peterson|art tatum|dizzy gillespie|louis armstrong|ella fitzgerald|billie holiday|nina simone|nat king cole|ray charles|bb king|muddy waters|robert johnson|howlin wolf|buddy guy|etta james|autumn leaves|take five|so what|blue in green|all the things|giant steps|round midnight|summertime.*gershwin|fly me to the moon|misty\b|my funny valentine|cheek to cheek'),
    ('newage', '🌙', 'New Age / Instrumental', r'yiruma|river flows in you|ludovico einaudi|joe hisaishi|ryuichi sakamoto|kitaro|enya|george winston|david lanz|brian crain|dustin o.halloran|nils frahm|olafur arnalds|max richter|hans zimmer|giovanni|secret garden|bandari|kevin kern|jim brickman|kiss the rain|love me|maybe|spring waltz|dream.*yiruma|when the love falls|if i could see you again|passacaglia'),
    ('pop', '🎤', 'Pop', r'taylor swift|billie eilish|ed sheeran|adele|ariana grande|bruno mars|the weeknd|dua lipa|shawn mendes|charlie puth|sam smith|sia\b|halsey|post malone|khalid|lizzo|doja cat|olivia rodrigo|harry styles|lana del rey|selena gomez|justin bieber|katy perry|lady gaga|rihanna|beyonce|drake\b|kanye|eminem|travis scott|bad bunny|shakira|miley cyrus|camila cabello|cardi b|nicki minaj|john legend|alicia keys|maroon 5|onerepublic|twenty one pilots|panic at the disco|fall out boy|paramore|all of me|shape of you|someone like you|rolling in the deep|hello.*adele|bad guy|lovely|happier|dance monkey|blinding lights|watermelon sugar|drivers license|stay.*kid laroi|as it was|anti.hero|cruel summer|flowers|butter\b|dynamite|permission to dance|despacito|uptown funk|thinking out loud|perfect.*sheeran|photograph.*sheeran|shallow|a thousand years|counting stars|believer|thunder.*imagine|radioactive.*imagine|demons.*imagine|heather|traitor|good 4 u|deja vu|vampire|night changes|story of my life|what makes you beautiful|closer.*chainsmokers|something just like this|dont start now|levitating|new rules|physical.*dua|break my soul|halo.*beyonce|crazy in love|umbrella.*rihanna|we found love|cheap thrills|chandelier|unstoppable|snowman.*sia|lost boy|faded|alone.*marshmello|see you again|7 years|happier.*marshmello|sunflower.*post|circles.*post|rockstar.*post|peaches|yummy|sorry.*bieber|love yourself|intentions|mood.*24kgoldn|savage love|astronaut in the ocean|heat waves|sweater weather|summertime sadness|young and beautiful|video games.*lana|neon lights|starboy|save your tears|cant feel my face|take me to church|stitches|treat you better|attention.*puth|we dont talk anymore|one call away|see you again.*puth|senorita|havana|señorita|señorita.*cabello|love story|blank space|shake it off|cardigan|willow|enchanted|love story|all too well|you belong with me|22\b.*swift|mean.*swift|everything i wanted|ocean eyes|lovely.*billie|when the party|bury a friend|no time to die|my future|therefore i am|nda\b|your power|easy on me|set fire to the rain|skyfall|when we were young|water under the bridge|million reasons|poker face|born this way|rain on me|shallow.*gaga|just the way you are|grenade.*mars|thats what i like|24k magic|versace|marry you|locked out of heaven|treasure.*mars'),
]

# Difficulty → slug
DIFF_MAP = {
    'Beginner': ('beginner', '🌱', 'Beginner 入门'),
    'Easy': ('easy', '🌿', 'Easy 简单'),
    'Medium': ('medium', '🎵', 'Medium 中等'),
    'Hard': ('hard', '🔥', 'Hard 困难'),
    'Expert': ('expert', '⚡', 'Expert 专家'),
}

def classify(name, query):
    text = (name + ' ' + query).lower()
    for slug, emoji, label, pat in CATEGORIES:
        if re.search(pat, text, re.IGNORECASE):
            return slug
    return 'other'

def extract_artist(name, query):
    """Try to extract artist from name patterns like 'Artist - Title'."""
    for sep in [' - ', ' – ', ' — ']:
        if sep in name:
            parts = name.split(sep, 1)
            if len(parts[0].strip()) > 1:
                return parts[0].strip()
    return ''

def main():
    with open(INDEX, 'r', encoding='utf-8') as f:
        index = json.load(f)
    
    # Classify all songs
    songs = []
    genre_counts = {}
    
    for sid, info in index.items():
        name = info.get('name', '')
        query = info.get('query', '')
        fname = info.get('file', '')
        difficulty = info.get('difficulty', 'Medium')
        notes = info.get('notes', 0)
        
        genre = classify(name, query)
        artist = extract_artist(name, query)
        
        genre_counts[genre] = genre_counts.get(genre, 0) + 1
        
        songs.append({
            'file': fname,
            'title': name,
            'composer': artist,
            'cat': difficulty,
            'fn': genre,
            'genre': genre,
            'difficulty': difficulty,
            'notes': notes,
            'path': f'midi-collection/{genre}/{fname}',
        })
    
    # Build categories
    cat_meta = {slug: (emoji, label) for slug, emoji, label, _ in CATEGORIES}
    cat_meta['other'] = ('🎵', 'Other 其他')
    
    categories = []
    for slug in sorted(genre_counts.keys(), key=lambda s: -genre_counts[s]):
        emoji, label = cat_meta.get(slug, ('🎵', slug))
        categories.append({
            'slug': slug,
            'emoji': emoji,
            'label': label,
            'count': genre_counts[slug],
        })
    
    # Create directories and copy files
    os.makedirs(DEST, exist_ok=True)
    copied = 0
    missing = 0
    for s in songs:
        genre = s['genre']
        dest_dir = os.path.join(DEST, genre)
        os.makedirs(dest_dir, exist_ok=True)
        src = os.path.join(MIDI_SRC, s['file'])
        dst = os.path.join(dest_dir, s['file'])
        if os.path.exists(src):
            if not os.path.exists(dst):
                shutil.copy2(src, dst)
            copied += 1
        else:
            missing += 1
            print(f'  MISSING: {s["file"]}')
    
    # Remove internal 'genre' key from songs
    for s in songs:
        del s['genre']
    
    # Write catalog.json
    catalog = {
        'generated': 'popular-midi-collection',
        'source': 'Downloaded MIDI collection (967 songs)',
        'total': len(songs),
        'categories': categories,
        'songs': songs,
    }
    
    cat_path = os.path.join(DEST, 'catalog.json')
    with open(cat_path, 'w', encoding='utf-8') as f:
        json.dump(catalog, f, ensure_ascii=False, indent=None)
    
    print(f'Done: {len(songs)} songs, {len(categories)} categories, {copied} copied, {missing} missing')
    for c in categories:
        print(f'  {c["emoji"]} {c["label"]}: {c["count"]}')

if __name__ == '__main__':
    main()
