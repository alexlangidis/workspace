export type ProductType = "Θήκες" | "Προστασία Οθόνης (Tempered Glass)";

type GenerateCategoryDescriptionParams = {
  model: string;
  focusKeyword: string;
  productType: ProductType;
};

const countExactOccurrences = (text: string, phrase: string): number => {
  if (!text || !phrase) {
    return 0;
  }

  return text.split(phrase).length - 1;
};

export function generateCategoryDescription({
  model,
  focusKeyword,
  productType,
}: GenerateCategoryDescriptionParams): string {
  const cleanModel = model.trim();
  const cleanKeyword = focusKeyword.trim();

  if (!cleanModel || !cleanKeyword) {
    return "";
  }

  if (productType === "Προστασία Οθόνης (Tempered Glass)") {
    const description = `Η συλλογή μας για ${cleanKeyword} είναι σχεδιασμένη για χρήστες που θέλουν αξιόπιστη προστασία χωρίς να αλλοιώνεται η εμπειρία χρήσης. Κάθε tempered glass επιλέγεται με βάση τη σκληρότητα 9H, την καθαρότητα εικόνας και την άμεση απόκριση στην αφή, ώστε η οθόνη να παραμένει ευκρινής και ευχάριστη στην καθημερινότητα. Αν ψάχνεις ${cleanKeyword}, θα βρεις λύσεις που εφαρμόζουν σωστά, με σταθερή κάλυψη και προσεγμένο φινίρισμα.

Στην κατηγορία θα βρεις tempered glass, προστατευτικό οθόνης, τζαμάκι υψηλής αντοχής, αντιχαρακτική μεμβράνη νέας γενιάς, clear glass με υψηλή διαφάνεια, επιλογές full cover και edge-to-edge προστασία. Η τοποθέτηση γίνεται εύκολα, με bubble-free εφαρμογή και σταθερό κράτημα στο panel. Οι προτάσεις είναι case-friendly με γενικό τρόπο, ώστε να συνεργάζονται σωστά με πολλά διαφορετικά αξεσουάρ. Για όσους χρειάζονται πιο ολοκληρωμένη κάλυψη, υπάρχει και δυνατότητα για προστασία κάμερας ως προαιρετικό add-on, χωρίς υπερβολικές υποσχέσεις.

• Σκληρότητα 9H για αποτελεσματική άμυνα απέναντι σε γρατζουνιές και καθημερινή φθορά.
• Υψηλή διαφάνεια για καθαρή εικόνα και φυσική απόδοση χρωμάτων.
• Διατήρηση touch sensitivity για άμεση απόκριση σε scroll, typing και gestures.
• Εύκολη εγκατάσταση με bubble-free εφαρμογή και σταθερό αποτέλεσμα.

Διάλεξε σήμερα την κατάλληλη ${cleanKeyword} και κράτησε τη συσκευή σου ασφαλή με καθαρή οθόνη και σίγουρη εφαρμογή.`;

    if (countExactOccurrences(description, cleanKeyword) >= 2) {
      return description;
    }

    return `${cleanKeyword}. ${description} ${cleanKeyword}`;
  }

  const description = `Η κατηγορία ${cleanKeyword} συγκεντρώνει επιλογές για καθημερινή προστασία και προσεγμένο στυλ, ώστε η συσκευή σου να παραμένει ασφαλής χωρίς να χάνει τον χαρακτήρα της. Αν αναζητάς ${cleanKeyword}, εδώ θα βρεις λύσεις που ισορροπούν ανάμεσα σε ανθεκτικότητα, άνετο κράτημα και σωστή εφαρμογή. Από slim επιλογές για διακριτικό προφίλ μέχρι rugged προτάσεις για πιο έντονη προστασία, η γκάμα καλύπτει διαφορετικές ανάγκες χρήσης.

Θα βρεις θήκη κινητού, κάλυμμα πλάτης, προστατευτική θήκη TPU, θήκη σιλικόνης, shockproof case, bumper case, μαλακό matte φινίρισμα και πρακτικές επιλογές με αντιολισθητικό grip. Τα υλικά όπως silicone και TPU προσφέρουν ευελιξία και αντοχή, ενώ τα precise cutouts εξασφαλίζουν εύκολη πρόσβαση σε κάμερα, κουμπιά και θύρες. Με σωστό σχεδιασμό, η συσκευή προστατεύεται αποτελεσματικά από πτώσεις και γρατζουνιές, χωρίς να γίνεται ογκώδης ή άβολη στην καθημερινή μεταφορά.

• Προστασία από πτώσεις και γρατζουνιές για πιο ασφαλή καθημερινή χρήση.
• Καλύτερο grip για σταθερό κράτημα και λιγότερα γλιστρήματα.
• Επιλογές design από slim έως rugged, ανάλογα με το προφίλ που θέλεις.
• Ποιοτικά υλικά silicone και TPU με αντοχή στη φθορά.
• Precise cutouts για άνεση σε φόρτιση, κάμερα και πλήκτρα.

Επίλεξε τώρα τις κατάλληλες ${cleanKeyword} και αναβάθμισε άμεσα την προστασία και την εμφάνιση της συσκευής σου.`;

  if (countExactOccurrences(description, cleanKeyword) >= 2) {
    return description;
  }

  return `${cleanKeyword}. ${description} ${cleanKeyword}`;
}
