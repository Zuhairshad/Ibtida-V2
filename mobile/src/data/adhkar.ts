/**
 * Daily adhkar, following Hisn al-Muslim (Saʿid al-Qahtani) and checked against the primary
 * collections cited on each entry. Only adhkar with an authentic (sahih or hasan) chain are
 * included, with the repetition count the narration itself gives; where a narration names no
 * count the dhikr is said once.
 *
 * Quranic adhkar (Ayat al-Kursi, the three Quls, the end of al-Baqarah) carry a reference only —
 * their text is loaded verbatim from Tanzil by `src/lib/quran.ts`, never typed here.
 */

export type QRef = { s: number; a: number; b?: number };
export type Dhikr = {
  id: string;
  /** Arabic text (non-Quranic adhkar). */
  ar?: string;
  /** Quranic passage: surah, first ayah, last ayah (inclusive, defaults to `a`). */
  q?: QRef;
  /** Short heading shown above Quranic passages and situational adhkar. */
  title?: string;
  tr?: string;
  en?: string;
  ur?: string;
  src: string;
  /** Times to say it. */
  n: number;
  /** Virtue or instruction from the narration. */
  note?: string;
  /** Approximate words per repetition, used for the time estimate. */
  w?: number;
};

/* --------------------------------------------------------------- Shared */

const KURSI: Dhikr = {
  id: 'kursi', q: { s: 2, a: 255 }, title: 'Ayat al-Kursi', n: 1, w: 50,
  src: 'Al-Hakim 1/562 · an-Nasaʾi, ʿAmal al-Yawm wal-Laylah 960',
  note: 'Whoever recites it is protected from the devils until the next morning or evening.',
};
const IKHLAS = (n: number, src: string, note?: string): Dhikr => ({ id: 'ikhlas', q: { s: 112, a: 1, b: 4 }, title: 'Surah al-Ikhlas', n, src, note, w: 19 });
const FALAQ = (n: number, src: string): Dhikr => ({ id: 'falaq', q: { s: 113, a: 1, b: 5 }, title: 'Surah al-Falaq', n, src, w: 27 });
const NAS = (n: number, src: string): Dhikr => ({ id: 'nas', q: { s: 114, a: 1, b: 6 }, title: 'Surah an-Nas', n, src, w: 24 });
const QULS_SRC = 'Abu Dawud 5082 · at-Tirmidhi 3575';
const QULS_NOTE = 'Recited three times morning and evening, they suffice you against everything.';

const BAQARAH_END: Dhikr = {
  id: 'baqarah-end', q: { s: 2, a: 285, b: 286 }, title: 'Last two ayat of al-Baqarah', n: 1, w: 62,
  src: 'Sahih al-Bukhari 5009 · Sahih Muslim 807',
  note: 'Whoever recites them at night, they will suffice him.',
};

const SAYYID: Dhikr = {
  id: 'sayyid-istighfar', title: 'Sayyid al-Istighfar', n: 1, w: 46,
  ar: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي، فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',
  tr: 'Allahumma anta rabbi la ilaha illa ant, khalaqtani wa ana ʿabduk, wa ana ʿala ʿahdika wa waʿdika mastataʿt, aʿudhu bika min sharri ma sanaʿt, abuʾu laka bi niʿmatika ʿalayya, wa abuʾu bi dhanbi faghfir li, fa innahu la yaghfirudh-dhunuba illa ant',
  en: 'O Allah, You are my Lord; there is no god but You. You created me and I am Your servant, and I keep Your covenant and promise as best I can. I seek refuge in You from the evil I have done. I acknowledge Your favour upon me and I acknowledge my sin, so forgive me, for none forgives sins but You.',
  ur: 'اے اللہ! تو میرا رب ہے، تیرے سوا کوئی معبود نہیں۔ تو نے مجھے پیدا کیا اور میں تیرا بندہ ہوں، اور میں اپنی استطاعت کے مطابق تیرے عہد اور وعدے پر قائم ہوں۔ میں اپنے کیے کے شر سے تیری پناہ مانگتا ہوں، تیری نعمتوں کا اقرار کرتا ہوں اور اپنے گناہ کا اعتراف کرتا ہوں، پس مجھے بخش دے، کیونکہ تیرے سوا کوئی گناہوں کو نہیں بخشتا۔',
  src: 'Sahih al-Bukhari 6306',
  note: 'Whoever says it with conviction during the day and dies before evening is of the people of Paradise — and likewise at night.',
};

const BISMILLAH_LA_YADURR: Dhikr = {
  id: 'bismillah-la-yadurr', n: 3, w: 18,
  ar: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ، وَهُوَ السَّمِيعُ الْعَلِيمُ',
  tr: 'Bismillahil-ladhi la yadurru maʿasmihi shayʾun fil-ardi wa la fis-samaʾ, wa huwas-samiʿul-ʿalim',
  en: 'In the name of Allah, with whose name nothing on earth or in the heavens can cause harm, and He is the All-Hearing, the All-Knowing.',
  ur: 'اللہ کے نام سے، جس کے نام کے ساتھ زمین و آسمان میں کوئی چیز نقصان نہیں پہنچا سکتی، اور وہی سننے والا، جاننے والا ہے۔',
  src: 'Abu Dawud 5088 · at-Tirmidhi 3388',
  note: 'Said three times, nothing will harm him.',
};

const RADITU: Dhikr = {
  id: 'raditu', n: 3, w: 12,
  ar: 'رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا',
  tr: 'Raditu billahi rabba, wa bil-islami dina, wa bi Muhammadin sallallahu ʿalayhi wa sallama nabiyya',
  en: 'I am pleased with Allah as my Lord, with Islam as my religion, and with Muhammad ﷺ as my Prophet.',
  ur: 'میں اللہ کے رب ہونے پر، اسلام کے دین ہونے پر اور محمد ﷺ کے نبی ہونے پر راضی ہوں۔',
  src: 'Abu Dawud 5072 · at-Tirmidhi 3389',
  note: 'Allah has promised to please the one who says it.',
};

const YA_HAYY: Dhikr = {
  id: 'ya-hayy', n: 1, w: 14,
  ar: 'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ',
  tr: 'Ya Hayyu ya Qayyum, bi rahmatika astaghith, aslih li shaʾni kullah, wa la takilni ila nafsi tarfata ʿayn',
  en: 'O Ever-Living, O Sustainer of all, by Your mercy I seek help: set right all my affairs and do not leave me to myself even for the blink of an eye.',
  ur: 'اے ہمیشہ زندہ، اے سب کو قائم رکھنے والے! تیری رحمت کے وسیلے سے فریاد کرتا ہوں، میرے سب کام درست فرما دے اور مجھے پلک جھپکنے کے برابر بھی میرے نفس کے حوالے نہ کر۔',
  src: 'An-Nasaʾi, al-Sunan al-Kubra 10405 · al-Hakim 1/545',
};

const AFIYAH: Dhikr = {
  id: 'afiyah', n: 1, w: 44,
  ar: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي دِينِي وَدُنْيَايَ وَأَهْلِي وَمَالِي، اللَّهُمَّ اسْتُرْ عَوْرَاتِي، وَآمِنْ رَوْعَاتِي، اللَّهُمَّ احْفَظْنِي مِنْ بَيْنِ يَدَيَّ، وَمِنْ خَلْفِي، وَعَنْ يَمِينِي، وَعَنْ شِمَالِي، وَمِنْ فَوْقِي، وَأَعُوذُ بِعَظَمَتِكَ أَنْ أُغْتَالَ مِنْ تَحْتِي',
  tr: 'Allahumma inni asʾalukal-ʿafwa wal-ʿafiyata fid-dunya wal-akhirah. Allahumma inni asʾalukal-ʿafwa wal-ʿafiyata fi dini wa dunyaya wa ahli wa mali. Allahummastur ʿawrati wa amin rawʿati. Allahummahfazni min bayni yadayya wa min khalfi, wa ʿan yamini wa ʿan shimali, wa min fawqi, wa aʿudhu bi ʿazamatika an ughtala min tahti',
  en: 'O Allah, I ask You for pardon and well-being in this world and the next. O Allah, I ask You for pardon and well-being in my religion, my worldly life, my family and my wealth. O Allah, cover my faults and calm my fears. O Allah, guard me from in front of me and behind me, from my right and my left, and from above me; and I seek refuge in Your greatness from being taken unawares from beneath me.',
  ur: 'اے اللہ! میں تجھ سے دنیا و آخرت میں معافی اور عافیت مانگتا ہوں۔ اے اللہ! میں تجھ سے اپنے دین، دنیا، گھر والوں اور مال میں معافی اور عافیت مانگتا ہوں۔ اے اللہ! میرے عیب چھپا دے اور میرے خوف کو امن میں بدل دے۔ اے اللہ! آگے، پیچھے، دائیں، بائیں اور اوپر سے میری حفاظت فرما، اور میں تیری عظمت کی پناہ مانگتا ہوں کہ نیچے سے اچانک ہلاک کیا جاؤں۔',
  src: 'Abu Dawud 5074 · Ibn Majah 3871',
  note: 'The Prophet ﷺ never left these words morning or evening.',
};

const ALIM_GHAYB: Dhikr = {
  id: 'alim-ghayb', n: 1, w: 36,
  ar: 'اللَّهُمَّ عَالِمَ الْغَيْبِ وَالشَّهَادَةِ، فَاطِرَ السَّمَاوَاتِ وَالْأَرْضِ، رَبَّ كُلِّ شَيْءٍ وَمَلِيكَهُ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا أَنْتَ، أَعُوذُ بِكَ مِنْ شَرِّ نَفْسِي، وَمِنْ شَرِّ الشَّيْطَانِ وَشِرْكِهِ، وَأَنْ أَقْتَرِفَ عَلَى نَفْسِي سُوءًا، أَوْ أَجُرَّهُ إِلَى مُسْلِمٍ',
  tr: 'Allahumma ʿalimal-ghaybi wash-shahadah, fatiras-samawati wal-ard, rabba kulli shayʾin wa malikah, ashhadu an la ilaha illa ant, aʿudhu bika min sharri nafsi, wa min sharrish-shaytani wa shirkih, wa an aqtarifa ʿala nafsi suʾan aw ajurrahu ila muslim',
  en: 'O Allah, Knower of the unseen and the seen, Originator of the heavens and the earth, Lord and Sovereign of all things: I bear witness that there is no god but You. I seek refuge in You from the evil of my soul, from the evil of Satan and his call to shirk, and from bringing harm upon myself or upon any Muslim.',
  ur: 'اے اللہ! غیب اور حاضر کے جاننے والے، آسمانوں اور زمین کے پیدا کرنے والے، ہر چیز کے رب اور مالک! میں گواہی دیتا ہوں کہ تیرے سوا کوئی معبود نہیں۔ میں اپنے نفس کے شر سے، شیطان کے شر اور اس کے شرک سے تیری پناہ مانگتا ہوں، اور اس سے کہ اپنے اوپر کوئی برائی کروں یا کسی مسلمان کی طرف اسے لے جاؤں۔',
  src: 'Abu Dawud 5067 · at-Tirmidhi 3392',
  note: 'Taught to Abu Bakr for the morning, the evening and when lying down.',
};

const AFINI: Dhikr = {
  id: 'afini', n: 3, w: 30,
  ar: 'اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَهَ إِلَّا أَنْتَ. اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكُفْرِ وَالْفَقْرِ، وَأَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ، لَا إِلَهَ إِلَّا أَنْتَ',
  tr: 'Allahumma ʿafini fi badani, Allahumma ʿafini fi samʿi, Allahumma ʿafini fi basari, la ilaha illa ant. Allahumma inni aʿudhu bika minal-kufri wal-faqr, wa aʿudhu bika min ʿadhabil-qabr, la ilaha illa ant',
  en: 'O Allah, grant me well-being in my body. O Allah, grant me well-being in my hearing. O Allah, grant me well-being in my sight. There is no god but You. O Allah, I seek refuge in You from disbelief and poverty, and I seek refuge in You from the punishment of the grave. There is no god but You.',
  ur: 'اے اللہ! میرے بدن میں عافیت دے، اے اللہ! میری سماعت میں عافیت دے، اے اللہ! میری بصارت میں عافیت دے، تیرے سوا کوئی معبود نہیں۔ اے اللہ! میں کفر اور فقر سے تیری پناہ مانگتا ہوں، اور قبر کے عذاب سے تیری پناہ مانگتا ہوں، تیرے سوا کوئی معبود نہیں۔',
  src: 'Abu Dawud 5090',
};

const SUBHAN_BIHAMDIH_100: Dhikr = {
  id: 'subhan-bihamdih', n: 100, w: 3,
  ar: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
  tr: 'SubhanAllahi wa bihamdih',
  en: 'Glory be to Allah, and all praise is His.',
  ur: 'اللہ پاک ہے اور تمام تعریف اسی کے لیے ہے۔',
  src: 'Sahih Muslim 2692',
  note: 'No one brings anything better on the Day of Resurrection, except one who said the same or more.',
};

const TAHLIL_100: Dhikr = {
  id: 'tahlil-100', n: 100, w: 14,
  ar: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
  tr: 'La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamd, wa huwa ʿala kulli shayʾin qadir',
  en: 'There is no god but Allah alone, without partner. His is the dominion and His is the praise, and He has power over all things.',
  ur: 'اللہ کے سوا کوئی معبود نہیں، وہ اکیلا ہے، اس کا کوئی شریک نہیں، اسی کی بادشاہی ہے اور اسی کے لیے تعریف ہے، اور وہ ہر چیز پر قادر ہے۔',
  src: 'Sahih al-Bukhari 3293 · Sahih Muslim 2691',
  note: 'A hundred times a day: the reward of freeing ten slaves, a hundred good deeds written, a hundred sins erased, and protection from Satan until evening.',
};

const ISTIGHFAR_100: Dhikr = {
  id: 'istighfar-100', n: 100, w: 4,
  ar: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ',
  tr: 'Astaghfirullaha wa atubu ilayh',
  en: 'I seek Allah’s forgiveness and I turn to Him in repentance.',
  ur: 'میں اللہ سے مغفرت مانگتا ہوں اور اسی کی طرف توبہ کرتا ہوں۔',
  src: 'Sahih Muslim 2702 · Sahih al-Bukhari 6307',
  note: 'The Prophet ﷺ sought forgiveness a hundred times a day.',
};

const KALIMAT_TAMMAT: Dhikr = {
  id: 'kalimat-tammat', n: 3, w: 8,
  ar: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
  tr: 'Aʿudhu bi kalimatillahit-tammati min sharri ma khalaq',
  en: 'I seek refuge in the perfect words of Allah from the evil of what He has created.',
  ur: 'میں اللہ کے کامل کلمات کی پناہ مانگتا ہوں ہر اس چیز کے شر سے جو اس نے پیدا کی۔',
  src: 'Sahih Muslim 2709 · at-Tirmidhi 3604',
  note: 'Said in the evening, no sting will harm him that night.',
};

/* ---------------------------------------------------------- Categories */

const MORNING: Dhikr[] = [
  KURSI,
  IKHLAS(3, QULS_SRC, QULS_NOTE), FALAQ(3, QULS_SRC), NAS(3, QULS_SRC),
  {
    id: 'asbahna-mulk', n: 1, w: 62,
    ar: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذَا الْيَوْمِ وَخَيْرَ مَا بَعْدَهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَذَا الْيَوْمِ وَشَرِّ مَا بَعْدَهُ، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ',
    tr: 'Asbahna wa asbahal-mulku lillah, wal-hamdu lillah, la ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu wa huwa ʿala kulli shayʾin qadir. Rabbi asʾaluka khayra ma fi hadhal-yawmi wa khayra ma baʿdah, wa aʿudhu bika min sharri ma fi hadhal-yawmi wa sharri ma baʿdah. Rabbi aʿudhu bika minal-kasali wa suʾil-kibar. Rabbi aʿudhu bika min ʿadhabin fin-nari wa ʿadhabin fil-qabr',
    en: 'We have entered the morning and the dominion belongs to Allah, and all praise is for Allah. There is no god but Allah alone, without partner; His is the dominion and His is the praise, and He has power over all things. My Lord, I ask You for the good of this day and the good after it, and I seek refuge in You from the evil of this day and the evil after it. My Lord, I seek refuge in You from laziness and the misery of old age. My Lord, I seek refuge in You from punishment in the Fire and punishment in the grave.',
    ur: 'ہم نے صبح کی اور ساری بادشاہی اللہ کی ہے، اور تمام تعریف اللہ کے لیے ہے۔ اللہ کے سوا کوئی معبود نہیں، وہ اکیلا ہے، اس کا کوئی شریک نہیں، اسی کی بادشاہی اور اسی کی تعریف ہے، اور وہ ہر چیز پر قادر ہے۔ اے میرے رب! میں تجھ سے اس دن کی بھلائی اور اس کے بعد کی بھلائی مانگتا ہوں، اور اس دن کے شر اور اس کے بعد کے شر سے تیری پناہ مانگتا ہوں۔ اے میرے رب! میں سستی اور بڑھاپے کی خرابی سے تیری پناہ مانگتا ہوں۔ اے میرے رب! میں آگ کے عذاب اور قبر کے عذاب سے تیری پناہ مانگتا ہوں۔',
    src: 'Sahih Muslim 2723',
  },
  {
    id: 'bika-asbahna', n: 1, w: 12,
    ar: 'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ',
    tr: 'Allahumma bika asbahna, wa bika amsayna, wa bika nahya, wa bika namutu, wa ilaykan-nushur',
    en: 'O Allah, by You we enter the morning and by You we enter the evening; by You we live and by You we die, and to You is the resurrection.',
    ur: 'اے اللہ! تیرے ہی حکم سے ہم نے صبح کی اور تیرے ہی حکم سے شام کی، تیرے ہی حکم سے ہم جیتے ہیں اور تیرے ہی حکم سے مرتے ہیں، اور تیری ہی طرف اٹھ کر جانا ہے۔',
    src: 'At-Tirmidhi 3391 · Abu Dawud 5068',
  },
  SAYYID,
  AFINI,
  AFIYAH,
  ALIM_GHAYB,
  BISMILLAH_LA_YADURR,
  RADITU,
  YA_HAYY,
  {
    id: 'fitrah-m', n: 1, w: 26,
    ar: 'أَصْبَحْنَا عَلَى فِطْرَةِ الْإِسْلَامِ، وَعَلَى كَلِمَةِ الْإِخْلَاصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ، وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ، حَنِيفًا مُسْلِمًا، وَمَا كَانَ مِنَ الْمُشْرِكِينَ',
    tr: 'Asbahna ʿala fitratil-islam, wa ʿala kalimatil-ikhlas, wa ʿala dini nabiyyina Muhammadin sallallahu ʿalayhi wa sallam, wa ʿala millati abina Ibrahima hanifan musliman wa ma kana minal-mushrikin',
    en: 'We have entered the morning upon the natural way of Islam, upon the word of sincere devotion, upon the religion of our Prophet Muhammad ﷺ, and upon the way of our father Ibrahim, upright and submitting, who was not of the polytheists.',
    ur: 'ہم نے فطرتِ اسلام پر، کلمۂ اخلاص پر، اپنے نبی محمد ﷺ کے دین پر اور اپنے باپ ابراہیم کی ملت پر صبح کی، جو یکسو مسلمان تھے اور مشرکوں میں سے نہ تھے۔',
    src: 'Musnad Ahmad 3/406',
  },
  {
    id: 'adad-khalqih', n: 3, w: 12,
    ar: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ',
    tr: 'SubhanAllahi wa bihamdih, ʿadada khalqih, wa rida nafsih, wa zinata ʿarshih, wa midada kalimatih',
    en: 'Glory be to Allah and all praise is His — as many times as the number of His creation, as much as pleases Him, as much as the weight of His Throne, and as much as the ink of His words.',
    ur: 'اللہ پاک ہے اور اسی کی تعریف ہے، اس کی مخلوق کی تعداد کے برابر، اس کی رضا کے برابر، اس کے عرش کے وزن کے برابر اور اس کے کلمات کی سیاہی کے برابر۔',
    src: 'Sahih Muslim 2726',
    note: 'Said three times after Fajr, these words outweigh hours of dhikr.',
  },
  {
    id: 'ilman-nafia', n: 1, w: 7,
    ar: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلًا مُتَقَبَّلًا',
    tr: 'Allahumma inni asʾaluka ʿilman nafiʿa, wa rizqan tayyiba, wa ʿamalan mutaqabbala',
    en: 'O Allah, I ask You for beneficial knowledge, good provision and accepted deeds.',
    ur: 'اے اللہ! میں تجھ سے نفع دینے والا علم، پاکیزہ رزق اور قبول ہونے والا عمل مانگتا ہوں۔',
    src: 'Ibn Majah 925',
    note: 'Said after the Fajr salam.',
  },
  SUBHAN_BIHAMDIH_100,
  TAHLIL_100,
  ISTIGHFAR_100,
];

const EVENING: Dhikr[] = [
  KURSI,
  BAQARAH_END,
  IKHLAS(3, QULS_SRC, QULS_NOTE), FALAQ(3, QULS_SRC), NAS(3, QULS_SRC),
  {
    id: 'amsayna-mulk', n: 1, w: 62,
    ar: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذِهِ اللَّيْلَةِ وَخَيْرَ مَا بَعْدَهَا، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَذِهِ اللَّيْلَةِ وَشَرِّ مَا بَعْدَهَا، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ',
    tr: 'Amsayna wa amsal-mulku lillah, wal-hamdu lillah, la ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu wa huwa ʿala kulli shayʾin qadir. Rabbi asʾaluka khayra ma fi hadhihil-laylati wa khayra ma baʿdaha, wa aʿudhu bika min sharri ma fi hadhihil-laylati wa sharri ma baʿdaha. Rabbi aʿudhu bika minal-kasali wa suʾil-kibar. Rabbi aʿudhu bika min ʿadhabin fin-nari wa ʿadhabin fil-qabr',
    en: 'We have entered the evening and the dominion belongs to Allah, and all praise is for Allah. There is no god but Allah alone, without partner; His is the dominion and His is the praise, and He has power over all things. My Lord, I ask You for the good of this night and the good after it, and I seek refuge in You from the evil of this night and the evil after it. My Lord, I seek refuge in You from laziness and the misery of old age. My Lord, I seek refuge in You from punishment in the Fire and punishment in the grave.',
    ur: 'ہم نے شام کی اور ساری بادشاہی اللہ کی ہے، اور تمام تعریف اللہ کے لیے ہے۔ اللہ کے سوا کوئی معبود نہیں، وہ اکیلا ہے، اس کا کوئی شریک نہیں، اسی کی بادشاہی اور اسی کی تعریف ہے، اور وہ ہر چیز پر قادر ہے۔ اے میرے رب! میں تجھ سے اس رات کی بھلائی اور اس کے بعد کی بھلائی مانگتا ہوں، اور اس رات کے شر اور اس کے بعد کے شر سے تیری پناہ مانگتا ہوں۔ اے میرے رب! میں سستی اور بڑھاپے کی خرابی سے تیری پناہ مانگتا ہوں۔ اے میرے رب! میں آگ کے عذاب اور قبر کے عذاب سے تیری پناہ مانگتا ہوں۔',
    src: 'Sahih Muslim 2723',
  },
  {
    id: 'bika-amsayna', n: 1, w: 12,
    ar: 'اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ',
    tr: 'Allahumma bika amsayna, wa bika asbahna, wa bika nahya, wa bika namutu, wa ilaykal-masir',
    en: 'O Allah, by You we enter the evening and by You we enter the morning; by You we live and by You we die, and to You is the final return.',
    ur: 'اے اللہ! تیرے ہی حکم سے ہم نے شام کی اور تیرے ہی حکم سے صبح کی، تیرے ہی حکم سے ہم جیتے ہیں اور تیرے ہی حکم سے مرتے ہیں، اور تیری ہی طرف لوٹنا ہے۔',
    src: 'At-Tirmidhi 3391 · Abu Dawud 5068',
  },
  SAYYID,
  AFINI,
  AFIYAH,
  ALIM_GHAYB,
  BISMILLAH_LA_YADURR,
  RADITU,
  YA_HAYY,
  {
    id: 'fitrah-e', n: 1, w: 26,
    ar: 'أَمْسَيْنَا عَلَى فِطْرَةِ الْإِسْلَامِ، وَعَلَى كَلِمَةِ الْإِخْلَاصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ، وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ، حَنِيفًا مُسْلِمًا، وَمَا كَانَ مِنَ الْمُشْرِكِينَ',
    tr: 'Amsayna ʿala fitratil-islam, wa ʿala kalimatil-ikhlas, wa ʿala dini nabiyyina Muhammadin sallallahu ʿalayhi wa sallam, wa ʿala millati abina Ibrahima hanifan musliman wa ma kana minal-mushrikin',
    en: 'We have entered the evening upon the natural way of Islam, upon the word of sincere devotion, upon the religion of our Prophet Muhammad ﷺ, and upon the way of our father Ibrahim, upright and submitting, who was not of the polytheists.',
    ur: 'ہم نے فطرتِ اسلام پر، کلمۂ اخلاص پر، اپنے نبی محمد ﷺ کے دین پر اور اپنے باپ ابراہیم کی ملت پر شام کی، جو یکسو مسلمان تھے اور مشرکوں میں سے نہ تھے۔',
    src: 'Musnad Ahmad 3/406',
  },
  KALIMAT_TAMMAT,
  SUBHAN_BIHAMDIH_100,
];

const AFTER_SALAH: Dhikr[] = [
  {
    id: 'astaghfirullah-3', n: 3, w: 2,
    ar: 'أَسْتَغْفِرُ اللَّهَ',
    tr: 'Astaghfirullah',
    en: 'I seek the forgiveness of Allah.',
    ur: 'میں اللہ سے مغفرت مانگتا ہوں۔',
    src: 'Sahih Muslim 591',
    note: 'Said three times as soon as the salam is given.',
  },
  {
    id: 'antas-salam', n: 1, w: 11,
    ar: 'اللَّهُمَّ أَنْتَ السَّلَامُ، وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ',
    tr: 'Allahumma antas-salam, wa minkas-salam, tabarakta ya dhal-jalali wal-ikram',
    en: 'O Allah, You are Peace and from You comes peace. Blessed are You, O Owner of majesty and honour.',
    ur: 'اے اللہ! تو ہی سلامتی والا ہے اور تجھ ہی سے سلامتی ہے، تو بڑی برکت والا ہے، اے جلال اور عزت والے۔',
    src: 'Sahih Muslim 591',
  },
  {
    id: 'la-mania', n: 1, w: 30,
    ar: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، اللَّهُمَّ لَا مَانِعَ لِمَا أَعْطَيْتَ، وَلَا مُعْطِيَ لِمَا مَنَعْتَ، وَلَا يَنْفَعُ ذَا الْجَدِّ مِنْكَ الْجَدُّ',
    tr: 'La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu wa huwa ʿala kulli shayʾin qadir. Allahumma la maniʿa lima aʿtayt, wa la muʿtiya lima manaʿt, wa la yanfaʿu dhal-jaddi minkal-jadd',
    en: 'There is no god but Allah alone, without partner; His is the dominion and His is the praise, and He has power over all things. O Allah, none can withhold what You give and none can give what You withhold, and the wealth of the wealthy cannot avail him against You.',
    ur: 'اللہ کے سوا کوئی معبود نہیں، وہ اکیلا ہے، اس کا کوئی شریک نہیں، اسی کی بادشاہی اور اسی کی تعریف ہے اور وہ ہر چیز پر قادر ہے۔ اے اللہ! جو تو دے اسے کوئی روکنے والا نہیں اور جو تو روکے اسے کوئی دینے والا نہیں، اور کسی دولت مند کو اس کی دولت تیرے مقابلے میں نفع نہیں دیتی۔',
    src: 'Sahih al-Bukhari 844 · Sahih Muslim 593',
  },
  {
    id: 'la-nabudu', n: 1, w: 44,
    ar: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ، لَا إِلَهَ إِلَّا اللَّهُ، وَلَا نَعْبُدُ إِلَّا إِيَّاهُ، لَهُ النِّعْمَةُ وَلَهُ الْفَضْلُ وَلَهُ الثَّنَاءُ الْحَسَنُ، لَا إِلَهَ إِلَّا اللَّهُ مُخْلِصِينَ لَهُ الدِّينَ وَلَوْ كَرِهَ الْكَافِرُونَ',
    tr: 'La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu wa huwa ʿala kulli shayʾin qadir. La hawla wa la quwwata illa billah. La ilaha illallah, wa la naʿbudu illa iyyah, lahun-niʿmatu wa lahul-fadlu wa lahuth-thanaʾul-hasan. La ilaha illallahu mukhlisina lahud-dina wa law karihal-kafirun',
    en: 'There is no god but Allah alone, without partner; His is the dominion and His is the praise, and He has power over all things. There is no might and no power except by Allah. There is no god but Allah and we worship none but Him. His is the blessing, His is the bounty and His is the fine praise. There is no god but Allah; we make our religion sincerely His, even though the disbelievers dislike it.',
    ur: 'اللہ کے سوا کوئی معبود نہیں، وہ اکیلا ہے، اس کا کوئی شریک نہیں، اسی کی بادشاہی اور اسی کی تعریف ہے اور وہ ہر چیز پر قادر ہے۔ گناہ سے بچنے کی طاقت اور نیکی کی قوت اللہ ہی کی توفیق سے ہے۔ اللہ کے سوا کوئی معبود نہیں، ہم اسی کی عبادت کرتے ہیں، نعمت اسی کی ہے، فضل اسی کا ہے اور اچھی تعریف اسی کے لیے ہے۔ اللہ کے سوا کوئی معبود نہیں، ہم دین کو اسی کے لیے خالص کرتے ہیں، اگرچہ کافروں کو ناگوار ہو۔',
    src: 'Sahih Muslim 594',
  },
  {
    id: 'tasbih-33', n: 33, w: 2,
    ar: 'سُبْحَانَ اللَّهِ', tr: 'SubhanAllah', en: 'Glory be to Allah.', ur: 'اللہ پاک ہے۔',
    src: 'Sahih Muslim 597',
  },
  {
    id: 'tahmid-33', n: 33, w: 2,
    ar: 'الْحَمْدُ لِلَّهِ', tr: 'Alhamdulillah', en: 'All praise is for Allah.', ur: 'تمام تعریف اللہ کے لیے ہے۔',
    src: 'Sahih Muslim 597',
  },
  {
    id: 'takbir-33', n: 33, w: 2,
    ar: 'اللَّهُ أَكْبَرُ', tr: 'Allahu akbar', en: 'Allah is the Greatest.', ur: 'اللہ سب سے بڑا ہے۔',
    src: 'Sahih Muslim 597',
  },
  {
    id: 'tahlil-1', n: 1, w: 14,
    ar: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    tr: 'La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamd, wa huwa ʿala kulli shayʾin qadir',
    en: 'There is no god but Allah alone, without partner. His is the dominion and His is the praise, and He has power over all things.',
    ur: 'اللہ کے سوا کوئی معبود نہیں، وہ اکیلا ہے، اس کا کوئی شریک نہیں، اسی کی بادشاہی ہے اور اسی کے لیے تعریف ہے، اور وہ ہر چیز پر قادر ہے۔',
    src: 'Sahih Muslim 597',
    note: 'Completes the hundred: his sins are forgiven even if they are like the foam of the sea.',
  },
  { ...KURSI, src: 'An-Nasaʾi, ʿAmal al-Yawm wal-Laylah 100 · Sahih al-Jamiʿ 6464', note: 'Whoever recites it after every obligatory prayer, nothing stands between him and Paradise except death.' },
  IKHLAS(1, 'Abu Dawud 1523 · an-Nasaʾi 1336'), FALAQ(1, 'Abu Dawud 1523 · an-Nasaʾi 1336'), NAS(1, 'Abu Dawud 1523 · an-Nasaʾi 1336'),
  {
    id: 'ainni', n: 1, w: 7,
    ar: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ، وَشُكْرِكَ، وَحُسْنِ عِبَادَتِكَ',
    tr: 'Allahumma aʿinni ʿala dhikrika wa shukrika wa husni ʿibadatik',
    en: 'O Allah, help me to remember You, to thank You and to worship You well.',
    ur: 'اے اللہ! اپنے ذکر، اپنے شکر اور اپنی اچھی عبادت پر میری مدد فرما۔',
    src: 'Abu Dawud 1522 · an-Nasaʾi 1303',
    note: 'The Prophet ﷺ told Muʿadh never to leave it at the end of every prayer.',
  },
];

const PROTECTION: Dhikr[] = [
  { ...KURSI, src: 'Sahih al-Bukhari 2311', note: 'A guardian from Allah stays with you and no devil comes near you until morning.' },
  BAQARAH_END,
  IKHLAS(3, QULS_SRC, QULS_NOTE), FALAQ(3, QULS_SRC), NAS(3, QULS_SRC),
  BISMILLAH_LA_YADURR,
  { ...KALIMAT_TAMMAT, src: 'Sahih Muslim 2708', note: 'Whoever stops at a place and says it, nothing harms him until he leaves.' },
  {
    id: 'kalimat-tammah', n: 1, w: 10,
    ar: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّةِ، مِنْ كُلِّ شَيْطَانٍ وَهَامَّةٍ، وَمِنْ كُلِّ عَيْنٍ لَامَّةٍ',
    tr: 'Aʿudhu bi kalimatillahit-tammah, min kulli shaytanin wa hammah, wa min kulli ʿaynin lammah',
    en: 'I seek refuge in the perfect words of Allah from every devil and every harmful creature, and from every evil eye.',
    ur: 'میں اللہ کے کامل کلمات کی پناہ مانگتا ہوں ہر شیطان اور ہر زہریلے جانور سے، اور ہر نظرِ بد سے۔',
    src: 'Sahih al-Bukhari 3371',
    note: 'The Prophet ﷺ sought refuge for al-Hasan and al-Husayn with these words.',
  },
  {
    id: 'hasbunallah', n: 1, w: 4,
    ar: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ',
    tr: 'Hasbunallahu wa niʿmal-wakil',
    en: 'Allah is sufficient for us, and He is the best Disposer of affairs.',
    ur: 'ہمیں اللہ کافی ہے اور وہ بہترین کارساز ہے۔',
    src: 'Sahih al-Bukhari 4563',
    note: 'Said by Ibrahim when thrown into the fire, and by the Prophet ﷺ when told that people had gathered against him.',
  },
];

const FORGIVENESS: Dhikr[] = [
  SAYYID,
  ISTIGHFAR_100,
  {
    id: 'rabbighfirli', n: 100, w: 7,
    ar: 'رَبِّ اغْفِرْ لِي، وَتُبْ عَلَيَّ، إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ',
    tr: 'Rabbighfir li, wa tub ʿalayya, innaka antat-tawwabur-rahim',
    en: 'My Lord, forgive me and accept my repentance; You are the Accepter of repentance, the Most Merciful.',
    ur: 'اے میرے رب! مجھے بخش دے اور میری توبہ قبول فرما، بے شک تو ہی توبہ قبول کرنے والا، نہایت رحم کرنے والا ہے۔',
    src: 'Abu Dawud 1516 · at-Tirmidhi 3434',
    note: 'The Companions counted the Prophet ﷺ saying it a hundred times in one sitting.',
  },
  {
    id: 'astaghfirullah-azim', n: 1, w: 12,
    ar: 'أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ، الْحَيَّ الْقَيُّومَ، وَأَتُوبُ إِلَيْهِ',
    tr: 'Astaghfirullahal-ʿazimal-ladhi la ilaha illa huwal-Hayyal-Qayyuma wa atubu ilayh',
    en: 'I seek the forgiveness of Allah the Magnificent, besides whom there is no god, the Ever-Living, the Sustainer, and I turn to Him in repentance.',
    ur: 'میں اللہ عظیم سے مغفرت مانگتا ہوں جس کے سوا کوئی معبود نہیں، جو ہمیشہ زندہ اور سب کو قائم رکھنے والا ہے، اور اسی کی طرف توبہ کرتا ہوں۔',
    src: 'Abu Dawud 1517 · at-Tirmidhi 3577',
    note: 'He is forgiven, even if he had fled from the battlefield.',
  },
  {
    id: 'zalamtu-nafsi', n: 1, w: 22,
    ar: 'اللَّهُمَّ إِنِّي ظَلَمْتُ نَفْسِي ظُلْمًا كَثِيرًا، وَلَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ، فَاغْفِرْ لِي مَغْفِرَةً مِنْ عِنْدِكَ، وَارْحَمْنِي، إِنَّكَ أَنْتَ الْغَفُورُ الرَّحِيمُ',
    tr: 'Allahumma inni zalamtu nafsi zulman kathira, wa la yaghfirudh-dhunuba illa ant, faghfir li maghfiratan min ʿindik, warhamni, innaka antal-Ghafurur-Rahim',
    en: 'O Allah, I have wronged myself greatly, and none forgives sins but You. So grant me forgiveness from Yourself and have mercy on me; You are the Forgiving, the Most Merciful.',
    ur: 'اے اللہ! میں نے اپنے اوپر بہت ظلم کیا ہے، اور تیرے سوا کوئی گناہوں کو نہیں بخشتا، پس اپنی طرف سے مجھے بخش دے اور مجھ پر رحم فرما، بے شک تو ہی بخشنے والا، نہایت رحم کرنے والا ہے۔',
    src: 'Sahih al-Bukhari 834 · Sahih Muslim 2705',
    note: 'Taught to Abu Bakr to say in his prayer.',
  },
  {
    id: 'dua-yunus', n: 1, w: 7, title: 'The supplication of Yunus',
    ar: 'لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ',
    tr: 'La ilaha illa anta subhanaka inni kuntu minaz-zalimin',
    en: 'There is no god but You; glory be to You. Indeed, I have been of the wrongdoers.',
    ur: 'تیرے سوا کوئی معبود نہیں، تو پاک ہے، بے شک میں ہی ظالموں میں سے تھا۔',
    src: 'At-Tirmidhi 3505 · Quran 21:87',
    note: 'No Muslim calls upon Allah with it for anything except that He answers him.',
  },
];

const GRATITUDE: Dhikr[] = [
  {
    id: 'alhamdulillah', n: 1, w: 2,
    ar: 'الْحَمْدُ لِلَّهِ', tr: 'Alhamdulillah', en: 'All praise is for Allah.', ur: 'تمام تعریف اللہ کے لیے ہے۔',
    src: 'At-Tirmidhi 3383 · Ibn Majah 3800',
    note: 'The best supplication is “Alhamdulillah”.',
  },
  {
    id: 'kalimatan', n: 1, w: 6,
    ar: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
    tr: 'SubhanAllahi wa bihamdih, SubhanAllahil-ʿAzim',
    en: 'Glory be to Allah and all praise is His; glory be to Allah, the Magnificent.',
    ur: 'اللہ پاک ہے اور اسی کی تعریف ہے، اللہ عظمت والا پاک ہے۔',
    src: 'Sahih al-Bukhari 6406 · Sahih Muslim 2694',
    note: 'Two words light on the tongue, heavy on the scale, beloved to the Most Merciful.',
  },
  {
    id: 'bi-nimatihi', n: 1, w: 6, title: 'On seeing something that pleases you',
    ar: 'الْحَمْدُ لِلَّهِ الَّذِي بِنِعْمَتِهِ تَتِمُّ الصَّالِحَاتُ',
    tr: 'Alhamdu lillahil-ladhi bi niʿmatihi tatimmus-salihat',
    en: 'All praise is for Allah, by whose favour good things are completed.',
    ur: 'تمام تعریف اللہ کے لیے ہے جس کی نعمت سے سب اچھے کام پورے ہوتے ہیں۔',
    src: 'Ibn Majah 3803',
  },
  {
    id: 'atamani', n: 1, w: 12, title: 'After eating',
    ar: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا، وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ',
    tr: 'Alhamdu lillahil-ladhi atʿamani hadha, wa razaqanihi min ghayri hawlin minni wa la quwwah',
    en: 'All praise is for Allah who fed me this and provided it for me without any might or power on my part.',
    ur: 'تمام تعریف اللہ کے لیے ہے جس نے مجھے یہ کھلایا اور میری کسی طاقت اور قوت کے بغیر مجھے یہ عطا کیا۔',
    src: 'Abu Dawud 4023 · at-Tirmidhi 3458',
    note: 'His previous sins are forgiven.',
  },
  {
    id: 'ahyana', n: 1, w: 8, title: 'On waking up',
    ar: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا، وَإِلَيْهِ النُّشُورُ',
    tr: 'Alhamdu lillahil-ladhi ahyana baʿda ma amatana wa ilayhin-nushur',
    en: 'All praise is for Allah who gave us life after causing us to die, and to Him is the resurrection.',
    ur: 'تمام تعریف اللہ کے لیے ہے جس نے ہمیں موت (نیند) کے بعد زندگی دی، اور اسی کی طرف اٹھ کر جانا ہے۔',
    src: 'Sahih al-Bukhari 6312',
  },
  {
    id: 'ainni-shukr', n: 1, w: 7,
    ar: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ، وَشُكْرِكَ، وَحُسْنِ عِبَادَتِكَ',
    tr: 'Allahumma aʿinni ʿala dhikrika wa shukrika wa husni ʿibadatik',
    en: 'O Allah, help me to remember You, to thank You and to worship You well.',
    ur: 'اے اللہ! اپنے ذکر، اپنے شکر اور اپنی اچھی عبادت پر میری مدد فرما۔',
    src: 'Abu Dawud 1522 · an-Nasaʾi 1303',
  },
];

const SLEEP: Dhikr[] = [
  IKHLAS(3, 'Sahih al-Bukhari 5017', 'Cup your hands, blow lightly into them, recite the three surahs, then wipe over as much of the body as you can — three times.'),
  FALAQ(3, 'Sahih al-Bukhari 5017'), NAS(3, 'Sahih al-Bukhari 5017'),
  { ...KURSI, src: 'Sahih al-Bukhari 2311', note: 'A guardian from Allah stays with you and no devil comes near you until morning.' },
  BAQARAH_END,
  {
    id: 'kafirun', q: { s: 109, a: 1, b: 6 }, title: 'Surah al-Kafirun', n: 1, w: 31,
    src: 'Abu Dawud 5055 · at-Tirmidhi 3403',
    note: 'Recite it, then sleep at its end — it is a declaration of freedom from shirk.',
  },
  {
    id: 'bismika-rabbi', n: 1, w: 24,
    ar: 'بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي، وَبِكَ أَرْفَعُهُ، فَإِنْ أَمْسَكْتَ نَفْسِي فَارْحَمْهَا، وَإِنْ أَرْسَلْتَهَا فَاحْفَظْهَا بِمَا تَحْفَظُ بِهِ عِبَادَكَ الصَّالِحِينَ',
    tr: 'Bismika rabbi wadaʿtu janbi, wa bika arfaʿuh, fa in amsakta nafsi farhamha, wa in arsaltaha fahfazha bima tahfazu bihi ʿibadakas-salihin',
    en: 'In Your name, my Lord, I lie down on my side, and by You I raise it. If You take my soul, have mercy on it; and if You send it back, protect it as You protect Your righteous servants.',
    ur: 'اے میرے رب! تیرے نام سے میں نے اپنا پہلو رکھا اور تیری ہی مدد سے اسے اٹھاؤں گا۔ اگر تو میری جان روک لے تو اس پر رحم فرما، اور اگر اسے چھوڑ دے تو اس کی ویسی حفاظت فرما جیسی تو اپنے نیک بندوں کی کرتا ہے۔',
    src: 'Sahih al-Bukhari 6320 · Sahih Muslim 2714',
  },
  {
    id: 'qini-adhabak', n: 3, w: 5,
    ar: 'اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ',
    tr: 'Allahumma qini ʿadhabaka yawma tabʿathu ʿibadak',
    en: 'O Allah, protect me from Your punishment on the Day You resurrect Your servants.',
    ur: 'اے اللہ! مجھے اپنے عذاب سے بچا جس دن تو اپنے بندوں کو اٹھائے گا۔',
    src: 'Abu Dawud 5045 · at-Tirmidhi 3398',
    note: 'Said lying on the right side with the right hand under the cheek.',
  },
  {
    id: 'bismika-amutu', n: 1, w: 4,
    ar: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
    tr: 'Bismika Allahumma amutu wa ahya',
    en: 'In Your name, O Allah, I die and I live.',
    ur: 'اے اللہ! تیرے ہی نام کے ساتھ میں مرتا (سوتا) اور جیتا (جاگتا) ہوں۔',
    src: 'Sahih al-Bukhari 6312',
  },
  {
    id: 'sleep-tasbih', n: 33, w: 2,
    ar: 'سُبْحَانَ اللَّهِ', tr: 'SubhanAllah', en: 'Glory be to Allah.', ur: 'اللہ پاک ہے۔',
    src: 'Sahih al-Bukhari 6318 · Sahih Muslim 2727',
    note: 'Taught to Fatimah and ʿAli: better for you than a servant.',
  },
  {
    id: 'sleep-tahmid', n: 33, w: 2,
    ar: 'الْحَمْدُ لِلَّهِ', tr: 'Alhamdulillah', en: 'All praise is for Allah.', ur: 'تمام تعریف اللہ کے لیے ہے۔',
    src: 'Sahih al-Bukhari 6318 · Sahih Muslim 2727',
  },
  {
    id: 'sleep-takbir', n: 34, w: 2,
    ar: 'اللَّهُ أَكْبَرُ', tr: 'Allahu akbar', en: 'Allah is the Greatest.', ur: 'اللہ سب سے بڑا ہے۔',
    src: 'Sahih al-Bukhari 6318 · Sahih Muslim 2727',
  },
  {
    id: 'aslamtu', n: 1, w: 34,
    ar: 'اللَّهُمَّ أَسْلَمْتُ نَفْسِي إِلَيْكَ، وَفَوَّضْتُ أَمْرِي إِلَيْكَ، وَوَجَّهْتُ وَجْهِي إِلَيْكَ، وَأَلْجَأْتُ ظَهْرِي إِلَيْكَ، رَغْبَةً وَرَهْبَةً إِلَيْكَ، لَا مَلْجَأَ وَلَا مَنْجَا مِنْكَ إِلَّا إِلَيْكَ، آمَنْتُ بِكِتَابِكَ الَّذِي أَنْزَلْتَ، وَبِنَبِيِّكَ الَّذِي أَرْسَلْتَ',
    tr: 'Allahumma aslamtu nafsi ilayk, wa fawwadtu amri ilayk, wa wajjahtu wajhi ilayk, wa aljaʾtu zahri ilayk, raghbatan wa rahbatan ilayk, la maljaʾa wa la manja minka illa ilayk, amantu bi kitabikal-ladhi anzalt, wa bi nabiyyikal-ladhi arsalt',
    en: 'O Allah, I submit myself to You, entrust my affair to You, turn my face to You and rely on You completely, out of hope in You and fear of You. There is no refuge and no escape from You except to You. I believe in Your Book which You revealed and in Your Prophet whom You sent.',
    ur: 'اے اللہ! میں نے اپنی جان تیرے سپرد کی، اپنا معاملہ تیرے حوالے کیا، اپنا چہرہ تیری طرف کیا اور اپنی پشت تیرے سہارے لگا دی، تیری رغبت اور تیرے خوف کے ساتھ۔ تجھ سے بچ کر کوئی پناہ اور نجات کی جگہ نہیں سوائے تیرے پاس۔ میں تیری کتاب پر ایمان لایا جو تو نے نازل کی اور تیرے نبی پر جسے تو نے بھیجا۔',
    src: 'Sahih al-Bukhari 6313 · Sahih Muslim 2710',
    note: 'Make these your last words: if you die that night, you die upon the fitrah.',
  },
];

const TRAVEL: Dhikr[] = [
  {
    id: 'safar', title: 'Setting out on a journey', n: 1, w: 60,
    ar: 'اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ، اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى، وَمِنَ الْعَمَلِ مَا تَرْضَى، اللَّهُمَّ هَوِّنْ عَلَيْنَا سَفَرَنَا هَذَا، وَاطْوِ عَنَّا بُعْدَهُ، اللَّهُمَّ أَنْتَ الصَّاحِبُ فِي السَّفَرِ، وَالْخَلِيفَةُ فِي الْأَهْلِ، اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ وَعْثَاءِ السَّفَرِ، وَكَآبَةِ الْمَنْظَرِ، وَسُوءِ الْمُنْقَلَبِ فِي الْمَالِ وَالْأَهْلِ',
    tr: 'Allahu akbar, Allahu akbar, Allahu akbar. Subhanal-ladhi sakhkhara lana hadha wa ma kunna lahu muqrinin, wa inna ila rabbina lamunqalibun. Allahumma inna nasʾaluka fi safarina hadhal-birra wat-taqwa, wa minal-ʿamali ma tarda. Allahumma hawwin ʿalayna safarana hadha watwi ʿanna buʿdah. Allahumma antas-sahibu fis-safar, wal-khalifatu fil-ahl. Allahumma inni aʿudhu bika min waʿthaʾis-safar, wa kaʾabatil-manzar, wa suʾil-munqalabi fil-mali wal-ahl',
    en: 'Allah is the Greatest (three times). Glory be to the One who has subjected this to us, for we could never have done so ourselves, and to our Lord we shall surely return. O Allah, we ask You on this journey for righteousness and piety, and for deeds that please You. O Allah, make this journey easy for us and shorten its distance. O Allah, You are the Companion on the journey and the Guardian of the family. O Allah, I seek refuge in You from the hardship of travel, from distressing sights, and from an evil return to wealth and family.',
    ur: 'اللہ سب سے بڑا ہے (تین بار)۔ پاک ہے وہ ذات جس نے اسے ہمارے تابع کر دیا، ورنہ ہم اسے قابو میں نہ لا سکتے تھے، اور بے شک ہم اپنے رب کی طرف لوٹنے والے ہیں۔ اے اللہ! ہم اپنے اس سفر میں تجھ سے نیکی اور تقویٰ مانگتے ہیں اور ایسا عمل جسے تو پسند کرے۔ اے اللہ! ہمارا یہ سفر آسان کر دے اور اس کی دوری ہم پر لپیٹ دے۔ اے اللہ! تو ہی سفر میں ساتھی اور گھر والوں میں نگہبان ہے۔ اے اللہ! میں سفر کی مشقت، برے منظر اور مال و اہل میں بری واپسی سے تیری پناہ مانگتا ہوں۔',
    src: 'Sahih Muslim 1342',
  },
  {
    id: 'rukub', title: 'Mounting a vehicle', n: 1, w: 40,
    ar: 'بِسْمِ اللَّهِ، الْحَمْدُ لِلَّهِ، سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ، الْحَمْدُ لِلَّهِ، الْحَمْدُ لِلَّهِ، الْحَمْدُ لِلَّهِ، اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، سُبْحَانَكَ اللَّهُمَّ إِنِّي ظَلَمْتُ نَفْسِي فَاغْفِرْ لِي، فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',
    tr: 'Bismillah, alhamdulillah. Subhanal-ladhi sakhkhara lana hadha wa ma kunna lahu muqrinin, wa inna ila rabbina lamunqalibun. Alhamdulillah, alhamdulillah, alhamdulillah. Allahu akbar, Allahu akbar, Allahu akbar. Subhanaka Allahumma inni zalamtu nafsi faghfir li, fa innahu la yaghfirudh-dhunuba illa ant',
    en: 'In the name of Allah; all praise is for Allah. Glory be to the One who has subjected this to us, for we could never have done so ourselves, and to our Lord we shall surely return. All praise is for Allah (three times). Allah is the Greatest (three times). Glory be to You, O Allah; I have wronged myself, so forgive me, for none forgives sins but You.',
    ur: 'اللہ کے نام سے، تمام تعریف اللہ کے لیے ہے۔ پاک ہے وہ ذات جس نے اسے ہمارے تابع کر دیا، ورنہ ہم اسے قابو میں نہ لا سکتے تھے، اور بے شک ہم اپنے رب کی طرف لوٹنے والے ہیں۔ الحمد للہ (تین بار)، اللہ اکبر (تین بار)۔ اے اللہ! تو پاک ہے، میں نے اپنے اوپر ظلم کیا، پس مجھے بخش دے، کیونکہ تیرے سوا کوئی گناہوں کو نہیں بخشتا۔',
    src: 'Abu Dawud 2602 · at-Tirmidhi 3446',
  },
  {
    id: 'ascending', title: 'When going up', n: 1, w: 2,
    ar: 'اللَّهُ أَكْبَرُ', tr: 'Allahu akbar', en: 'Allah is the Greatest.', ur: 'اللہ سب سے بڑا ہے۔',
    src: 'Sahih al-Bukhari 2993',
  },
  {
    id: 'descending', title: 'When going down', n: 1, w: 2,
    ar: 'سُبْحَانَ اللَّهِ', tr: 'SubhanAllah', en: 'Glory be to Allah.', ur: 'اللہ پاک ہے۔',
    src: 'Sahih al-Bukhari 2993',
  },
  { ...KALIMAT_TAMMAT, n: 1, title: 'When stopping at a place', src: 'Sahih Muslim 2708', note: 'Nothing will harm him until he moves on from that place.' },
  {
    id: 'astawdiu', title: 'Bidding a traveller farewell', n: 1, w: 6,
    ar: 'أَسْتَوْدِعُ اللَّهَ دِينَكَ، وَأَمَانَتَكَ، وَخَوَاتِيمَ عَمَلِكَ',
    tr: 'Astawdiʿullaha dinaka, wa amanataka, wa khawatima ʿamalik',
    en: 'I entrust to Allah your religion, your trust and the final outcome of your deeds.',
    ur: 'میں تمہارا دین، تمہاری امانت اور تمہارے اعمال کا انجام اللہ کے سپرد کرتا ہوں۔',
    src: 'Abu Dawud 2600 · at-Tirmidhi 3443',
  },
  {
    id: 'ayibun', title: 'On returning', n: 1, w: 5,
    ar: 'آيِبُونَ، تَائِبُونَ، عَابِدُونَ، لِرَبِّنَا حَامِدُونَ',
    tr: 'Ayibuna, taʾibuna, ʿabiduna, li rabbina hamidun',
    en: 'We return, repenting, worshipping, and praising our Lord.',
    ur: 'ہم لوٹنے والے، توبہ کرنے والے، عبادت کرنے والے اور اپنے رب کی تعریف کرنے والے ہیں۔',
    src: 'Sahih Muslim 1342',
  },
];

export type AdhkarCat = { k: string; ar: string; bg: string; items: Dhikr[] };

export const ADHKAR: AdhkarCat[] = [
  { k: 'Morning', ar: 'أذكار الصباح', bg: 'linear-gradient(160deg, #D9853F, #8E4430)', items: MORNING },
  { k: 'Evening', ar: 'أذكار المساء', bg: 'linear-gradient(160deg, #6A5AA8, #2A2552)', items: EVENING },
  { k: 'After Salah', ar: 'بعد الصلاة', bg: 'linear-gradient(160deg, #2E8079, #1A4447)', items: AFTER_SALAH },
  { k: 'Protection', ar: 'التحصين', bg: 'linear-gradient(160deg, #4568B3, #1F2E5E)', items: PROTECTION },
  { k: 'Forgiveness', ar: 'الاستغفار', bg: 'linear-gradient(160deg, #8C5AA3, #432A57)', items: FORGIVENESS },
  { k: 'Gratitude', ar: 'الشكر', bg: 'linear-gradient(160deg, #B98440, #6A4520)', items: GRATITUDE },
  { k: 'Before Sleep', ar: 'أذكار النوم', bg: 'linear-gradient(160deg, #34406A, #12172B)', items: SLEEP },
  { k: 'Travel', ar: 'أذكار السفر', bg: 'linear-gradient(160deg, #4F8A6A, #233F31)', items: TRAVEL },
];

export const adhkarCat = (k: string) => ADHKAR.find(c => c.k === k) ?? ADHKAR[0];

/** Minutes to recite a category at a calm pace (~150 Arabic words a minute). */
export const catMinutes = (c: AdhkarCat) => Math.max(1, Math.round(c.items.reduce((a, d) => a + (d.w ?? 8) * d.n, 0) / 150));

/** Total repetitions in a category. */
export const catReps = (c: AdhkarCat) => c.items.reduce((a, d) => a + d.n, 0);

/** The category suited to the time of day: Morning from Fajr until Asr, Evening from Asr, Sleep after Isha. */
export function catForNow(phase: 'Fajr' | 'Sunrise' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha' | string) {
  if (phase === 'Asr' || phase === 'Maghrib') return 'Evening';
  if (phase === 'Isha') return 'Before Sleep';
  return 'Morning';
}
