import os
import re
import json

VIEWS_DIR = "/home/szcze/projects/netfilmx-movie-catalog/NetFilmx_Web/Views"
ADMIN_VIEWS_DIR = "/home/szcze/projects/netfilmx-movie-catalog/NetFilmx_Web/Areas/Admin/Views"

translations_pl = {}
translations_en = {}

def slugify(text):
    text = text.strip().lower()
    chars = {'ą':'a', 'ć':'c', 'ę':'e', 'ł':'l', 'ń':'n', 'ó':'o', 'ś':'s', 'ź':'z', 'ż':'z'}
    for k, v in chars.items():
        text = text.replace(k, v)
    text = re.sub(r'[^a-z0-9]+', '_', text)
    return text.strip('_')

# Mapping dictionary for English translations to automatically translate common phrases
common_translations = {
    "strona glowna": "Home",
    "filmy": "Movies",
    "serie": "Series",
    "panel admina": "Admin Panel",
    "zaloguj sie": "Log In",
    "zarejestruj sie": "Sign Up",
    "wyloguj": "Logout",
    "witaj": "Welcome",
    "dodaj nowe wideo": "Add New Video",
    "dodaj nowa serie": "Add New Series",
    "nowa kategoria": "New Category",
    "przeglad systemu": "System Overview",
    "calkowita liczba wideo": "Total Videos",
    "liczba uzytkownikow": "Total Users",
    "suma zakupow": "Total Purchases",
    "szybkie akcje": "Quick Actions",
    "edytuj": "Edit",
    "usun": "Delete",
    "zapisz": "Save",
    "powrot": "Back",
    "anuluj": "Cancel",
    "szczegoly": "Details",
    "dodaj": "Add",
    "czy na pewno chcesz usunac": "Are you sure you want to delete",
    "potwierdz usuniecie": "Confirm Deletion",
    "nazwa": "Name",
    "opis": "Description",
    "cena": "Price",
    "okladka": "Cover",
    "nazwa uzytkownika": "Username",
    "haslo": "Password",
    "adres email": "Email Address",
    "data utworzenia": "Created At"
}

def get_en_translation(original, slug):
    for pl_key, en_val in common_translations.items():
        if pl_key in slug.replace('_', ' '):
            return en_val
    return original + " [EN]"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Match tags with purely text content (no nested <tags>)
    pattern = re.compile(r'(<(h[1-6]|a|button|label|p|span|div|strong|th|td)\b(?:[^>]*?))>(.*?)(<\/\2>)', re.IGNORECASE | re.DOTALL)
    
    def replacer(match):
        start_tag_no_bracket = match.group(1)
        tag_name = match.group(2)
        text = match.group(3)
        end_tag = match.group(4)
        
        # If the inner content has < or >, it means it contains nested HTML, we skip it
        if '<' in text or '>' in text:
            return match.group(0)
            
        original_text = text.strip()
        
        if not original_text:
            return match.group(0)
            
        if '@' in original_text or original_text.startswith('{') or original_text.startswith('}'):
            return match.group(0)
            
        if not re.search(r'[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]', original_text):
            return match.group(0)
            
        slug = slugify(original_text)
        if len(slug) > 30:
            slug = slug[:30]
            
        # Hardcode some keys for consistency
        key = f"t_{slug}"
        
        if key not in translations_pl:
            translations_pl[key] = original_text
            translations_en[key] = get_en_translation(original_text, slug)
            
        if 'data-i18n=' in start_tag_no_bracket:
            return match.group(0)
            
        new_start_tag = f'{start_tag_no_bracket} data-i18n="{key}">'
        return f'{new_start_tag}{text}{end_tag}'

    new_content = pattern.sub(replacer, content)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
            
def run():
    for d in [VIEWS_DIR, ADMIN_VIEWS_DIR]:
        for root, dirs, files in os.walk(d):
            for file in files:
                if file.endswith('.cshtml'):
                    process_file(os.path.join(root, file))
                    
    os.makedirs("/home/szcze/projects/netfilmx-movie-catalog/NetFilmx_Web/wwwroot/locales", exist_ok=True)
    with open("/home/szcze/projects/netfilmx-movie-catalog/NetFilmx_Web/wwwroot/locales/pl.json", 'w', encoding='utf-8') as f:
        json.dump(translations_pl, f, ensure_ascii=False, indent=2)
    with open("/home/szcze/projects/netfilmx-movie-catalog/NetFilmx_Web/wwwroot/locales/en.json", 'w', encoding='utf-8') as f:
        json.dump(translations_en, f, ensure_ascii=False, indent=2)
        
    print(f"Extracted {len(translations_pl)} keys.")

if __name__ == '__main__':
    run()
