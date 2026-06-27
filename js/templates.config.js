// js/templates.config.js
// SATU-SATUNYA tempat untuk daftarkan template baru.
// Jangan hardcode template ID di file lain manapun.

window.TEMPLATES = {
  "birthday-smooch": {
    name: "Birthday Smooch",
    category: "Birthday",
    cardFile: "/card/birthday-smooch.html",
    fields: [
      { id: "nama_pengirim", label: "Nama Pengirim", type: "text", required: false },
      { id: "nama_penerima", label: "Nama Penerima", type: "text", required: true },
      { id: "pesan", label: "Pesan Ucapan", type: "textarea", required: true },
      { id: "foto_url", label: "Foto", type: "image", required: false },
      { id: "musik_url", label: "Link Musik (YouTube)", type: "url", required: false }
    ]
  },
  "wisuda-retro": {
    name: "Wisuda Retro",
    category: "Wisuda",
    cardFile: "/card/wisuda-retro.html",
    fields: [
      { id: "nama_penerima", label: "Nama Wisudawan/ti", type: "text", required: true },
      { id: "jurusan", label: "Jurusan", type: "text", required: true },
      { id: "pesan", label: "Pesan Ucapan", type: "textarea", required: true },
      { id: "foto_url", label: "Foto", type: "image", required: true }
    ]
  }
};
