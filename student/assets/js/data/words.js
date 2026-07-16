export const WORDS = [
  { id: "kaa", text: "กา", order: 1, visualType: "image", imagePath: "../assets/images/words/kaa.webp", imageAlt: "ภาพนกกา", audioPath: "../assets/audio/words/kaa.mp3", hint: "กอ อา กา" },
  { id: "kop", text: "กบ", order: 2, visualType: "image", imagePath: "../assets/images/words/kop.webp", imageAlt: "ภาพกบสีเขียว", audioPath: "../assets/audio/words/kop.mp3", hint: "กอ โอะ บอ กบ" },
  { id: "chon", text: "ชน", order: 3, visualType: "wordCard", imagePath: "", imageAlt: "บัตรคำ ชน", audioPath: "../assets/audio/words/chon.mp3", hint: "ชอ โอะ นอ ชน" },
  { id: "dee", text: "ดี", order: 4, visualType: "image", imagePath: "../assets/images/words/dee.webp", imageAlt: "เด็กหญิงยกนิ้วโป้งแสดงว่าดี", audioPath: "../assets/audio/words/dee.mp3", hint: "ดอ อี ดี" },
  { id: "kae", text: "แก", order: 5, visualType: "wordCard", imagePath: "", imageAlt: "บัตรคำ แก", audioPath: "../assets/audio/words/kae.mp3", hint: "กอ แอ แก" },
  { id: "the", text: "เท", order: 6, visualType: "image", imagePath: "../assets/images/words/the.webp", imageAlt: "เด็กกำลังเทน้ำใส่แก้ว", audioPath: "../assets/audio/words/the.mp3", hint: "ทอ เอ เท" },
  { id: "rao", text: "เรา", order: 7, visualType: "wordCard", imagePath: "", imageAlt: "บัตรคำ เรา", audioPath: "../assets/audio/words/rao.mp3", hint: "รอ เอา เรา" },
  { id: "ro", text: "รอ", order: 8, visualType: "image", imagePath: "../assets/images/words/ro.webp", imageAlt: "เด็กนั่งรออย่างใจเย็น", audioPath: "../assets/audio/words/ro.mp3", hint: "รอ ออ รอ" },
  { id: "laa", text: "ลา", order: 9, visualType: "image", imagePath: "../assets/images/words/laa.webp", imageAlt: "ภาพลาตัวน้อย", audioPath: "../assets/audio/words/laa.mp3", hint: "ลอ อา ลา" },
  { id: "suea", text: "เสือ", order: 10, visualType: "image", imagePath: "../assets/images/words/suea.webp", imageAlt: "ภาพเสือตัวน้อย", audioPath: "../assets/audio/words/suea.mp3", hint: "สอ เอือ เสือ" }
];

export const WORD_BY_ID = Object.fromEntries(WORDS.map((word) => [word.id, word]));
