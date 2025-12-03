const donors = [];
let pendingDonation = null;
const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1445487652735549683/b_CQGchcumc0G0pAy0hq6ABAXW9Ei9wQolEvwwoS2g66lLR3LZcU6Wf6UhJm19O-MFjG';

// Polling interval untuk cek konfirmasi dari Discord
let pollInterval = null;

function createConfetti() {
    const colors = ['#32cd32', '#228b22', '#90ee90', '#00ff00'];
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 2 + 's';
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
            document.getElementById('thankYouModal').appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 3000);
        }, i * 30);
    }
}

function closeThankYouModal() {
    document.getElementById('thankYouModal').classList.remove('show');
    document.querySelector('.donors-section').scrollIntoView({ behavior: 'smooth' });
}

function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

function updateDonorList() {
    const donorList = document.getElementById('donorList');
    const totalAmount = document.getElementById('totalAmount');

    if (donors.length === 0) {
        donorList.innerHTML = '<p style="text-align: center; color: #808080; padding: 40px;">Belum ada donatur. Jadilah yang pertama bersedekah di Jumat Berkah! 🕌</p>';
        totalAmount.textContent = 'Rp 0';
        return;
    }

    const total = donors.reduce((sum, donor) => sum + donor.amount, 0);
    totalAmount.textContent = formatRupiah(total);

    donorList.innerHTML = donors.map(donor => `
        <div class="donor-item">
            <div class="donor-name">🤲 ${donor.name}</div>
            <div class="donor-amount">${formatRupiah(donor.amount)}</div>
        </div>
    `).join('');
}

async function sendToDiscord(name, amount, proofFile) {
    try {
        const formData = new FormData();
        const timestamp = Date.now();
        
        // Buat embed message dengan tema Jumat Berkah
        const embed = {
            title: "🕌 DONASI JUMAT BERKAH - Menunggu Konfirmasi",
            description: "**Barakallahu fiikum!** Ada donasi baru yang menunggu konfirmasi admin.\n\nKlik tombol di bawah untuk konfirmasi donasi ini.",
            color: 2263842, // Green color untuk tema Jumat Berkah
            fields: [
                {
                    name: "👤 Nama Donatur",
                    value: name,
                    inline: true
                },
                {
                    name: "💵 Nominal Donasi",
                    value: formatRupiah(amount),
                    inline: true
                },
                {
                    name: "🆔 ID Donasi",
                    value: `JUMAT-${timestamp}`,
                    inline: false
                },
                {
                    name: "📅 Waktu",
                    value: new Date().toLocaleString('id-ID', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    inline: false
                }
            ],
            timestamp: new Date().toISOString(),
            footer: {
                text: "Donasi Jumat Berkah - Sedekah Penuh Barakah 🤲"
            },
            thumbnail: {
                url: "https://cdn-icons-png.flaticon.com/512/2321/2321074.png"
            }
        };

        // Tambahkan instructions untuk admin
        const content = `🔔 **DONASI JUMAT BERKAH BARU!**\n\n**Cara Konfirmasi:**\nBalas pesan ini dengan: \`KONFIRMASI JUMAT-${timestamp}\`\n\n**Cara Tolak:**\nBalas pesan ini dengan: \`TOLAK JUMAT-${timestamp}\`\n\n**Doa untuk Donatur:**\n_"Ya Allah, berkahilah harta donatur ini, lapangkanlah rezekinya, dan jadikanlah sedekahnya sebagai penghapus dosa dan penambah pahala. Aamiin."_`;

        const payload = {
            content: content,
            embeds: [embed]
        };

        formData.append('payload_json', JSON.stringify(payload));
        
        // Tambahkan file bukti transfer
        if (proofFile) {
            formData.append('file', proofFile, `bukti_jumat_${name}_${timestamp}.${proofFile.name.split('.').pop()}`);
        }

        const response = await fetch(DISCORD_WEBHOOK, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Gagal mengirim ke Discord');
        }

        return timestamp;
    } catch (error) {
        console.error('Error sending to Discord:', error);
        alert('Terjadi kesalahan saat mengirim data. Silakan coba lagi.');
        return null;
    }
}

function startPolling(donationId, name, amount) {
    // Simpan ke sessionStorage untuk tracking
    sessionStorage.setItem(`pending_${donationId}`, JSON.stringify({ name, amount, timestamp: Date.now() }));
    
    console.log(`🕌 Menunggu konfirmasi untuk donasi ID: JUMAT-${donationId}`);
    console.log(`📋 Instruksi untuk admin: Balas di Discord dengan "KONFIRMASI JUMAT-${donationId}"`);
}

// Fungsi untuk manually approve dari console (untuk testing)
window.approveDonation = function(donationId) {
    const pending = sessionStorage.getItem(`pending_${donationId}`);
    if (pending) {
        const data = JSON.parse(pending);
        donors.unshift({ name: data.name, amount: data.amount });
        updateDonorList();
        
        // Tampilkan modal ucapan terima kasih
        document.getElementById('thankYouModal').classList.add('show');
        createConfetti();
        
        // Hapus dari pending
        sessionStorage.removeItem(`pending_${donationId}`);
        
        // Reset UI
        document.getElementById('donationForm').reset();
        document.getElementById('donationInfo').style.display = 'none';
        document.getElementById('paymentSimulator').style.display = 'none';
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
        submitBtn.textContent = '🎁 Kirim Donasi Berkah';
        
        pendingDonation = null;
        
        // Kirim konfirmasi ke Discord
        fetch(DISCORD_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                embeds: [{
                    title: "✅ Donasi Jumat Berkah Dikonfirmasi!",
                    description: `**Barakallahu fiikum!**\n\nDonasi dari **${data.name}** sebesar **${formatRupiah(data.amount)}** telah dikonfirmasi dan ditambahkan ke website Donasi Jumat Berkah.\n\n🤲 _Semoga menjadi amal jariyah yang mengalir pahalanya._`,
                    color: 5763719, // Green
                    timestamp: new Date().toISOString(),
                    footer: {
                        text: "Donasi Jumat Berkah - Confirmed"
                    }
                }]
            })
        });
        
        alert('✅ Alhamdulillah, donasi telah dikonfirmasi!');
    } else {
        alert('❌ ID donasi tidak ditemukan!');
    }
};

// Form submit - mengirim data ke Discord
document.getElementById('donationForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const amount = parseInt(document.getElementById('amount').value);
    const proofFile = document.getElementById('proof').files[0];

    if (!proofFile) {
        alert('Mohon upload bukti transfer!');
        return;
    }

    // Disable button saat proses
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Mengirim ke Admin...';

    // Kirim ke Discord dan dapatkan ID donasi
    const donationId = await sendToDiscord(name, amount, proofFile);
    
    if (!donationId) {
        submitBtn.disabled = false;
        submitBtn.textContent = '🎁 Kirim Donasi Berkah';
        return;
    }

    // Simpan data pending
    pendingDonation = { id: donationId, name, amount };

    // Start polling untuk konfirmasi
    startPolling(donationId, name, amount);

    // Tampilkan info menunggu konfirmasi
    document.getElementById('waitingName').textContent = name;
    document.getElementById('waitingAmount').textContent = formatRupiah(amount);
    document.getElementById('donationInfo').style.display = 'block';

    // Tampilkan status menunggu
    document.getElementById('paymentSimulator').style.display = 'block';
    submitBtn.style.opacity = '0.5';
    submitBtn.style.cursor = 'not-allowed';
    submitBtn.textContent = '⏳ Menunggu Konfirmasi Admin';

    // Scroll ke section QRIS
    document.getElementById('qrisSection').scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Tampilkan instruksi di console
    console.log(`%c🕌 DONASI JUMAT BERKAH BARU!`, 'font-size: 20px; color: #32cd32; font-weight: bold;');
    console.log(`%cBarakallahu fiikum atas donasinya!`, 'font-size: 14px; color: #a0a0a0;');
    console.log(`%cUntuk approve donasi ini, jalankan command:`, 'font-size: 14px; color: #a0a0a0;');
    console.log(`%capproveDonation(${donationId})`, 'font-size: 16px; color: #4caf50; font-weight: bold; background: #0a4d0a; padding: 5px;');
});

// Initialize
updateDonorList();

// Info untuk developer
console.log('%c🕌 DONASI JUMAT BERKAH', 'font-size: 18px; color: #32cd32; font-weight: bold;');
console.log('%c💡 INFO DEVELOPER', 'font-size: 16px; color: #228b22; font-weight: bold;');
console.log('%cUntuk simulasi konfirmasi donasi, gunakan:', 'color: #a0a0a0;');
console.log('%capproveDonation(DONATION_ID)', 'color: #4caf50; font-weight: bold;');
console.log('%cDONATION_ID akan muncul di console setelah submit form', 'color: #a0a0a0;');
console.log('%c\n🤲 Barakallahu fiikum untuk semua yang bersedekah di hari Jumat!', 'color: #32cd32; font-style: italic;');