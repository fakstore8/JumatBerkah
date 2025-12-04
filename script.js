const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyWtpHyiJPHjEDLgSjU9F6HM4JtjiV28ftKhZRVXqpDgAGMDJ41WlRVzs0vLKGoWqjNAQ/exec';
const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1445487652735549683/b_CQGchcumc0G0pAy0hq6ABAXW9Ei9wQolEvwwoS2g66lLR3LZcU6Wf6UhJm19O-MFjG';

const donors = [];
let isLoading = false;

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
    return new Intl.NumberFormat('id-ID', {style: 'currency', currency: 'IDR', minimumFractionDigits: 0}).format(amount);
}

function updateDonorList() {
    const donorList = document.getElementById('donorList');
    const totalAmount = document.getElementById('totalAmount');
    if (donors.length === 0) {
        donorList.innerHTML = '<p style="text-align: center; color: #808080; padding: 40px;">Belum ada donatur. Jadilah yang pertama! 🕌</p>';
        totalAmount.textContent = 'Rp 0';
        return;
    }
    const total = donors.reduce((sum, donor) => sum + donor.amount, 0);
    totalAmount.textContent = formatRupiah(total);
    donorList.innerHTML = donors.map(donor => `<div class="donor-item"><div class="donor-name">🤲 ${donor.name}</div><div class="donor-amount">${formatRupiah(donor.amount)}</div></div>`).join('');
}

async function loadDonations() {
    if (isLoading) return;
    isLoading = true;
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL);
        const data = await response.json();
        if (data.success && data.donations) {
            donors.length = 0;
            data.donations.forEach(donation => {
                donors.push({name: donation.name, amount: parseInt(donation.amount)});
            });
            donors.reverse();
            updateDonorList();
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        isLoading = false;
    }
}

async function uploadToImgur(file) {
    const formData = new FormData();
    formData.append('image', file);
    try {
        const response = await fetch('https://api.imgur.com/3/image', {
            method: 'POST',
            headers: {'Authorization': 'Client-ID 4e6e7e11a8c6c2c'},
            body: formData
        });
        const data = await response.json();
        if (data.success) return data.data.link;
        return null;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

async function submitDonation(name, amount, proofFile) {
    try {
        const proofUrl = await uploadToImgur(proofFile);
        const payload = {action: 'submit_donation', name: name, amount: amount, proofUrl: proofUrl || 'No proof'};
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {'Content-Type': 'text/plain'},
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (data.success) return data.id;
        else throw new Error(data.message || 'Gagal');
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

document.getElementById('donationForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const amount = parseInt(document.getElementById('amount').value);
    const proofFile = document.getElementById('proof').files[0];
    if (!proofFile) {
        alert('Mohon upload bukti transfer!');
        return;
    }
    const submitBtn = document.getElementById('submitBtn');
    const successMessage = document.getElementById('successMessage');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Mengirim...';
    try {
        const donationId = await submitDonation(name, amount, proofFile);
        successMessage.classList.add('show');
        document.getElementById('thankYouModal').classList.add('show');
        createConfetti();
        document.getElementById('donationForm').reset();
        setTimeout(() => {successMessage.classList.remove('show');}, 5000);
        console.log('✅ Donasi berhasil! ID: JUMAT-' + donationId);
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '🎁 Kirim Donasi Berkah';
    }
});

setInterval(loadDonations, 10000);
loadDonations();
console.log('🕌 Sistem Donasi Jumat Berkah - Aktif ✅');
    
