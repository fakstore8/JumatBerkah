const donors = [];
let pendingDonation = null;
const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1445487652735549683/b_CQGchcumc0G0pAy0hq6ABAXW9Ei9wQolEvwwoS2g66lLR3LZcU6Wf6UhJm19O-MFjG';

// Polling interval untuk cek konfirmasi dari Discord
let pollInterval = null;

// Load donors dari localStorage saat pertama kali
function loadDonors() {
    const saved = localStorage.getItem('donors_jumat_berkah');
    if (saved) {
        const loaded = JSON.parse(saved);
        donors.push(...loaded);
    }
}

// Save donors ke localStorage
function saveDonors() {
    localStorage.setItem('donors_jumat_berkah', JSON.stringify(donors));
}

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
        const content = `🔔 **DONASI JUMAT BERKAH BARU!**\n\n**Cara Konfirmasi:**\nBuka website, tekan F12, ketik di console: \`approveDonation(${timestamp})\`\n\n**Cara Tolak:**\nBuka website, tekan F12, ketik di console: \`rejectDonation(${timestamp})\`\n\n**Doa untuk Donatur:**\n_"Ya Allah, berkahilah harta donatur ini, lapangkanlah rezekinya, dan jadikanlah sedekahnya sebagai penghapus dosa dan penambah pahala. Aamiin."_`;

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
    // Simpan ke localStorage untuk tracking (persistent)
    localStorage.setItem(`pending_${donationId}`, JSON.stringify({ name, amount, timestamp: Date.now() }));
    
    console.log('%c🕌 DONASI BARU MENUNGGU KONFIRMASI', 'font-size: 18px; color: #32cd32; font-weight: bold; background: #0a4d0a; padding: 10px;');
    console.log(`%cID Donasi: JUMAT-${donationId}`, 'font-size: 14px; color: #a0a0a0;');
    console.log(`%cNama: ${name}`, 'font-size: 14px; color: #a0a0a0;');
    console.log(`%cNominal: ${formatRupiah(amount)}`, 'font-size: 14px; color: #a0a0a0;');
    console.log('%c\n📋 CARA KONFIRMASI:', 'font-size: 16px; color: #ffc107; font-weight: bold;');
    console.log(`%capproveDonation(${donationId})`, 'font-size: 16px; color: #4caf50; font-weight: bold; background: #1a1a1a; padding: 5px;');
    console.log('%c\n📋 CARA TOLAK:', 'font-size: 16px; color: #ffc107; font-weight: bold;');
    console.log(`%crejectDonation(${donationId})`, 'font-size: 16px; color: #f44336; font-weight: bold; background: #1a1a1a; padding: 5px;');
}

// Fungsi untuk manually approve dari console (untuk testing)
window.approveDonation = function(donationId) {
    const pending = localStorage.getItem(`pending_${donationId}`);
    if (pending) {
        const data = JSON.parse(pending);
        donors.unshift({ name: data.name, amount: data.amount });
        saveDonors();
        updateDonorList();
        
        // Tampilkan modal ucapan terima kasih
        document.getElementById('thankYouModal').classList.add('show');
        createConfetti();
        
        // Hapus dari pending
        localStorage.removeItem(`pending_${donationId}`);
        
        // Reset UI jika masih pending
        if (pendingDonation && pendingDonation.id === donationId) {
            document.getElementById('donationForm').reset();
            document.getElementById('donationInfo').style.display = 'none';
            document.getElementById('paymentSimulator').style.display = 'none';
            const submitBtn = document.getElementById('submitBtn');
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
            submitBtn.textContent = '🎁 Kirim Donasi Berkah';
            pendingDonation = null;
        }
        
        // Kirim konfirmasi ke Discord
        fetch(DISCORD_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                embeds: [{
                    title: "✅ Donasi Jumat Berkah Dikonfirmasi!",
                    description: `**Barakallahu fiikum!**\n\nDonasi dari **${data.name}** sebesar **${formatRupiah(data.amount)}** telah dikonfirmasi dan ditambahkan ke website Donasi Jumat Berkah.\n\n🤲 _Semoga menjadi amal jariyah yang mengalir pahalanya._`,
                    color: 5763719,
                    timestamp: new Date().toISOString(),
                    footer: {
                        text: "Donasi Jumat Berkah - Confirmed"
                    }
                }]
            })
        });
        
        console.log('%c✅ Alhamdulillah, donasi telah dikonfirmasi!', 'font-size: 16px; color: #4caf50; font-weight: bold;');
        alert('✅ Alhamdulillah, donasi telah dikonfirmasi!');
    } else {
        console.log('%c❌ ID donasi tidak ditemukan!', 'font-size: 16px; color: #f44336; font-weight: bold;');
        alert('❌ ID donasi tidak ditemukan!');
    }
};

// Fungsi untuk reject donasi
window.rejectDonation = function(donationId) {
    const pending = localStorage.getItem(`pending_${donationId}`);
    if (pending) {
        const data = JSON.parse(pending);
        
        // Hapus dari pending
        localStorage.removeItem(`pending_${donationId}`);
        
        // Reset UI jika masih pending
        if (pendingDonation && pendingDonation.id === donationId) {
            document.getElementById('donationForm').reset();
            document.getElementById('donationInfo').style.display = 'none';
            document.getElementById('paymentSimulator').style.display = 'none';
            const submitBtn = document.getElementById('submitBtn');
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
            submitBtn.textContent = '🎁 Kirim Donasi Berkah';
            pendingDonation = null;
        }
        
        // Kirim notifikasi ke Discord
        fetch(DISCORD_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                embeds: [{
                    title: "❌ Donasi Ditolak",
                    description: `Donasi dari **${data.name}** sebesar **${formatRupiah(data.amount)}** telah ditolak.`,
                    color: 15158332,
                    timestamp: new Date().toISOString(),
                    footer: {
                        text: "Donasi Jumat Berkah - Rejected"
                    }
                }]
            })
        });
        
        console.log('%c❌ Donasi ditolak', 'font-size: 16px; color: #f44336; font-weight: bold;');
        alert('❌ Donasi ditolak');
    } else {
        console.log('%c❌ ID donasi tidak ditemukan!', 'font-size: 16px; color: #f44336; font-weight: bold;');
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
    console.log(`%cUntuk tolak donasi ini, jalankan command:`, 'font-size: 14px; color: #a0a0a0;');
    console.log(`%crejectDonation(${donationId})`, 'font-size: 16px; color: #f44336; font-weight: bold; background: #0a4d0a; padding: 5px;');
});

// Initialize - Load data saat pertama kali
loadDonors();
updateDonorList();

// Cek pending donations saat load
window.addEventListener('load', function() {
    const allKeys = Object.keys(localStorage);
    const pendingKeys = allKeys.filter(key => key.startsWith('pending_'));
    
    if (pendingKeys.length > 0) {
        console.log('%c⏳ ADA DONASI PENDING', 'font-size: 18px; color: #ffc107; font-weight: bold; background: #1a1a1a; padding: 10px;');
        console.log(`%cTotal: ${pendingKeys.length} donasi menunggu konfirmasi`, 'font-size: 14px; color: #a0a0a0;');
        console.log('%c\n📋 DAFTAR DONASI PENDING:', 'font-size: 16px; color: #ffc107; font-weight: bold;');
        
        pendingKeys.forEach(key => {
            const donationId = key.replace('pending_', '');
            const data = JSON.parse(localStorage.getItem(key));
            console.log(`\n%cID: JUMAT-${donationId}`, 'font-size: 14px; color: #32cd32; font-weight: bold;');
            console.log(`%cNama: ${data.name}`, 'font-size: 13px; color: #a0a0a0;');
            console.log(`%cNominal: ${formatRupiah(data.amount)}`, 'font-size: 13px; color: #a0a0a0;');
            console.log(`%cWaktu: ${new Date(data.timestamp).toLocaleString('id-ID')}`, 'font-size: 13px; color: #a0a0a0;');
            console.log(`%cApprove: approveDonation(${donationId})`, 'font-size: 13px; color: #4caf50;');
            console.log(`%cTolak: rejectDonation(${donationId})`, 'font-size: 13px; color: #f44336;');
        });
    }
});

// Helper functions untuk admin
window.showAllPending = function() {
    const allKeys = Object.keys(localStorage);
    const pendingKeys = allKeys.filter(key => key.startsWith('pending_'));
    
    if (pendingKeys.length === 0) {
        console.log('%c✅ Tidak ada donasi pending', 'font-size: 16px; color: #4caf50;');
        return;
    }
    
    console.log('%c📋 DAFTAR SEMUA DONASI PENDING', 'font-size: 18px; color: #ffc107; font-weight: bold; background: #1a1a1a; padding: 10px;');
    console.log(`%cTotal: ${pendingKeys.length} donasi\n`, 'font-size: 14px; color: #a0a0a0;');
    
    pendingKeys.forEach((key, index) => {
        const donationId = key.replace('pending_', '');
        const data = JSON.parse(localStorage.getItem(key));
        console.log(`%c${index + 1}. ID: JUMAT-${donationId}`, 'font-size: 14px; color: #32cd32; font-weight: bold;');
        console.log(`   Nama: ${data.name}`);
        console.log(`   Nominal: ${formatRupiah(data.amount)}`);
        console.log(`   Waktu: ${new Date(data.timestamp).toLocaleString('id-ID')}`);
        console.log(`   %cApprove: approveDonation(${donationId})`, 'color: #4caf50;');
        console.log(`   %cTolak: rejectDonation(${donationId})\n`, 'color: #f44336;');
    });
};

window.clearAllPending = function() {
    if (!confirm('⚠️ Yakin ingin menghapus SEMUA donasi pending?')) return;
    
    const allKeys = Object.keys(localStorage);
    const pendingKeys = allKeys.filter(key => key.startsWith('pending_'));
    
    pendingKeys.forEach(key => localStorage.removeItem(key));
    
    console.log('%c✅ Semua donasi pending telah dihapus', 'font-size: 16px; color: #4caf50; font-weight: bold;');
};

window.showAllDonors = function() {
    console.log('%c👥 DAFTAR SEMUA DONATUR', 'font-size: 18px; color: #32cd32; font-weight: bold; background: #0a4d0a; padding: 10px;');
    console.log(`%cTotal Donatur: ${donors.length}`, 'font-size: 14px; color: #a0a0a0;');
    
    const total = donors.reduce((sum, donor) => sum + donor.amount, 0);
    console.log(`%cTotal Donasi: ${formatRupiah(total)}\n`, 'font-size: 14px; color: #32cd32; font-weight: bold;');
    
    donors.forEach((donor, index) => {
        console.log(`${index + 1}. ${donor.name} - ${formatRupiah(donor.amount)}`);
    });
};

// Info untuk developer
console.log('%c🕌 DONASI JUMAT BERKAH - ADMIN PANEL', 'font-size: 20px; color: #32cd32; font-weight: bold; background: #0a4d0a; padding: 15px;');
console.log('%c\n📋 PERINTAH YANG TERSEDIA:', 'font-size: 16px; color: #ffc107; font-weight: bold;');
console.log('%c\n1️⃣ Lihat donasi pending:', 'font-size: 14px; color: #a0a0a0;');
console.log('%c   showAllPending()', 'font-size: 14px; color: #4caf50; font-weight: bold;');
console.log('%c\n2️⃣ Approve donasi:', 'font-size: 14px; color: #a0a0a0;');
console.log('%c   approveDonation(DONATION_ID)', 'font-size: 14px; color: #4caf50; font-weight: bold;');
console.log('%c\n3️⃣ Tolak donasi:', 'font-size: 14px; color: #a0a0a0;');
console.log('%c   rejectDonation(DONATION_ID)', 'font-size: 14px; color: #f44336; font-weight: bold;');
console.log('%c\n4️⃣ Lihat semua donatur:', 'font-size: 14px; color: #a0a0a0;');
console.log('%c   showAllDonors()', 'font-size: 14px; color: #4caf50; font-weight: bold;');
console.log('%c\n5️⃣ Hapus semua pending:', 'font-size: 14px; color: #a0a0a0;');
console.log('%c   clearAllPending()', 'font-size: 14px; color: #f44336; font-weight: bold;');
console.log('%c\n🤲 Barakallahu fiikum untuk semua yang bersedekah di hari Jumat!', 'font-size: 14px; color: #32cd32; font-style: italic;');
