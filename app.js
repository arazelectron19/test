import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCF74oiYNEvgWm1rJA7fFERN3kClB1ypSM",
    authDomain: "led-zakaz.firebaseapp.com",
    projectId: "led-zakaz",
    storageBucket: "led-zakaz.firebasestorage.app",
    messagingSenderId: "102340279964",
    appId: "1:102340279964:web:fda009aeddf5cccc5b3759",
    measurementId: "G-4JW29M5CCR"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const saveBtn = document.getElementById('saveBtn');
const deleteBtn = document.getElementById('deleteBtn');
const ledList = document.getElementById('ledList');
const searchInput = document.getElementById('searchInput');
const ledFileInput = document.getElementById('ledFileInput');
const fileSelectedName = document.getElementById('fileSelectedName');
const modalTitle = document.getElementById('modalTitle');
const modal = document.getElementById('addModal');
const openModalBtn = document.getElementById('openModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');

const imagePreviewModal = document.getElementById('imagePreviewModal');
const closePreviewBtn = document.getElementById('closePreviewBtn');
const previewTitle = document.getElementById('previewTitle');
const previewImage = document.getElementById('previewImage');
const previewBox = document.getElementById('previewBox');
const previewPrice = document.getElementById('previewPrice');
const goToEditBtn = document.getElementById('goToEditBtn');

const tabAnbar = document.getElementById('tabAnbar');
const tabZakaz = document.getElementById('tabZakaz');
const listTitle = document.getElementById('listTitle');
const btnSendWhatsApp = document.getElementById('btnSendWhatsApp'); 
let currentTab = "anbar"; 

const loadingContainer = document.getElementById('loadingContainer');

const selectionHeader = document.getElementById('selectionHeader');
const selectionCount = document.getElementById('selectionCount');
const btnCancelSelection = document.getElementById('btnCancelSelection');
const btnSelectAll = document.getElementById('btnSelectAll');
const btnDeleteSelected = document.getElementById('btnDeleteSelected');
const btnChangeSelectedQty = document.getElementById('btnChangeSelectedQty'); // Yeni düymə

let isSelectionMode = false;
let selectedItemIds = []; 
let loadedZakazIds = [];  
let allLoadedZakazItems = []; 

const choiceModal = document.getElementById('choiceModal');
const btnCreateNew = document.getElementById('btnCreateNew');
const btnSelectFromAnbar = document.getElementById('btnSelectFromAnbar');
const anbarSelectModal = document.getElementById('anbarSelectModal');
const closeAnbarSelectBtn = document.getElementById('closeAnbarSelectBtn');
const anbarSearchInput = document.getElementById('anbarSearchInput');
const m_anbarSelectContainer = document.getElementById('anbarSelectContainer');
const countModal = document.getElementById('countModal');
const closeCountBtn = document.getElementById('closeCountBtn');
const countModalModelName = document.getElementById('countModalModelName');
const zakazCountInput = document.getElementById('zakazCountInput');
const btnConfirmZakaz = document.getElementById('btnConfirmZakaz');

let base64Image = "";
let currentSelectedData = null;
let selectedAnbarItemForZakaz = null;
let allAnbarItems = [];

function showToast(message, isError = false) {
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.style.cssText = `
        background-color: ${isError ? '#f44336' : '#4CAF50'};
        color: white;
        padding: 14px 24px;
        border-radius: 8px;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        opacity: 0;
        transform: translateX(50px);
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        font-family: inherit;
        font-size: 14px;
    `;
    toast.innerText = message;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 50);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(50px)';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

if (tabAnbar) {
    tabAnbar.addEventListener('click', () => {
        exitSelectionMode(); 
        currentTab = "anbar"; 
        if (listTitle) listTitle.innerText = "Anbardakı LED-lər"; 
        if (btnSendWhatsApp) btnSendWhatsApp.style.setProperty('display', 'none', 'important');

        tabAnbar.classList.add('active');
        tabZakaz.classList.remove('active');
        
        tabAnbar.style.backgroundColor = "#007bff";
        tabAnbar.style.color = "#ffffff";
        tabZakaz.style.backgroundColor = "";
        tabZakaz.style.color = "";

        ledleriGetir(searchInput ? searchInput.value : ""); 
    });
}

if (tabZakaz) {
    tabZakaz.addEventListener('click', () => {
        exitSelectionMode(); 
        currentTab = "zakaz"; 
        if (listTitle) listTitle.innerText = "Sifariş Olunacaq LED-lər (Zakaz)"; 
        if (btnSendWhatsApp) btnSendWhatsApp.style.setProperty('display', 'inline-flex', 'important');

        tabZakaz.classList.add('active');
        tabAnbar.classList.remove('active');

        tabZakaz.style.backgroundColor = "#28a745"; 
        tabZakaz.style.color = "#ffffff";
        tabAnbar.style.backgroundColor = "";
        tabAnbar.style.color = "";

        ledleriGetir(searchInput ? searchInput.value : ""); 
    });
}

function exitSelectionMode() {
    isSelectionMode = false;
    selectedItemIds = [];
    if (selectionHeader) {
        selectionHeader.style.setProperty('display', 'none', 'important'); 
    }
    document.querySelectorAll('.led-card').forEach(el => el.classList.remove('selected-item'));
}

function enterSelectionMode(firstItemId, cardElement) {
    if (currentTab !== "zakaz") return; 
    isSelectionMode = true;
    if (selectionHeader) {
        selectionHeader.style.setProperty('display', 'flex', 'important'); 
    }
    toggleItemSelection(firstItemId, cardElement);
}

function toggleItemSelection(itemId, cardElement) {
    const index = selectedItemIds.indexOf(itemId);
    if (index > -1) {
        selectedItemIds.splice(index, 1);
        cardElement.classList.remove('selected-item');
    } else {
        selectedItemIds.push(itemId);
        cardElement.classList.add('selected-item');
    }
    
    if (selectionCount) {
        selectionCount.innerText = `${selectedItemIds.length} seçildi`;
    }
    
    if (selectedItemIds.length === 0) {
        exitSelectionMode();
    }
}

if (btnCancelSelection) btnCancelSelection.addEventListener('click', exitSelectionMode);

if (btnSelectAll) {
    btnSelectAll.addEventListener('click', () => {
        selectedItemIds = [...loadedZakazIds];
        document.querySelectorAll('.led-card').forEach(el => el.classList.add('selected-item'));
        if (selectionCount) selectionCount.innerText = `${selectedItemIds.length} seçildi`;
    });
}

if (btnDeleteSelected) {
    btnDeleteSelected.addEventListener('click', async () => {
        if (selectedItemIds.length === 0) return;

        try {
            btnDeleteSelected.innerText = "Silinir...";
            const batch = writeBatch(db);
            selectedItemIds.forEach((id) => {
                const docRef = doc(db, "ledler", id);
                batch.delete(docRef);
            });
            await batch.commit();
            exitSelectionMode();
            ledleriGetir(searchInput ? searchInput.value : "");
            showToast("Seçilmişlər uğurla silindi.");
        } catch (err) {
            showToast("Xəta baş verdi.", true);
        } finally {
            if (btnDeleteSelected) btnDeleteSelected.innerText = "Sil";
        }
    });
}

// ⚡ YENİ: SAYI DƏYİŞ DÜYMƏSİNİN KLİK HADİSƏSİ
if (btnChangeSelectedQty) {
    btnChangeSelectedQty.addEventListener('click', () => {
        if (selectedItemIds.length === 0) {
            showToast("Zəhmət olmasa ən azı 1 LED seçin!", true);
            return;
        }

        const selectedDocId = selectedItemIds[0];
        const selectedItem = allLoadedZakazItems.find(item => item.id === selectedDocId);

        if (!selectedItem) {
            showToast("Məlumat tapılmadı.", true);
            return;
        }

        countModalModelName.innerText = `${selectedItem.ledAdi} (Qutu: ${selectedItem.qutuNomresi})`;
        zakazCountInput.value = selectedItem.sifarisSayi || 1;
        
        btnConfirmZakaz.dataset.mode = "update";
        btnConfirmZakaz.dataset.targetId = selectedDocId;
        btnConfirmZakaz.innerText = "Sayı Yenilə";

        countModal.style.display = 'flex';
    });
}

if (openModalBtn) openModalBtn.addEventListener('click', () => { choiceModal.style.display = 'flex'; });

if (btnCreateNew) {
    btnCreateNew.addEventListener('click', () => {
        choiceModal.style.display = 'none';
        closeAndResetModal();
        if (modalTitle) modalTitle.innerText = "Yeni LED Əlavə Et";
        if (saveBtn) saveBtn.innerText = "Yadda saxla";
        if (deleteBtn) deleteBtn.style.display = "none";
        modal.style.display = 'flex';
    });
}

if (btnSelectFromAnbar) {
    btnSelectFromAnbar.addEventListener('click', () => {
        choiceModal.style.display = 'none';
        anbarSearchInput.value = "";
        anbarSelectModal.style.display = 'flex';
        anbarSiyahisiniYukle();
    });
}

if (closeAnbarSelectBtn) closeAnbarSelectBtn.addEventListener('click', () => anbarSelectModal.style.display = 'none');

if (closeCountBtn) {
    closeCountBtn.addEventListener('click', () => {
        delete btnConfirmZakaz.dataset.mode;
        delete btnConfirmZakaz.dataset.targetId;
        btnConfirmZakaz.innerText = "Sifariş Siyahısına Əlavə Et";
        countModal.style.display = 'none';
    });
}

async function anbarSiyahisiniYukle() {
    m_anbarSelectContainer.innerHTML = "<p style='text-align:center; color:#666;'>Yüklənir...</p>";
    try {
        const q = query(collection(db, "ledler"), orderBy("tarix", "desc"));
        const querySnapshot = await getDocs(q);
        allAnbarItems = [];
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if ((data.status || "anbar") === "anbar") {
                allAnbarItems.push({ id: docSnap.id, ...data });
            }
        });
        anbarListesiniGoster(allAnbarItems);
    } catch (e) {
        m_anbarSelectContainer.innerHTML = "<p style='color:red;'>Xəta oldu.</p>";
    }
}

function anbarListesiniGoster(items) {
    m_anbarSelectContainer.innerHTML = "";
    if (items.length === 0) {
        m_anbarSelectContainer.innerHTML = "<p style='text-align:center; color:#888;'>Mal tapılmadı.</p>";
        return;
    }
    items.forEach((item) => {
        const voltText = item.volt ? ` | ${item.volt}` : "";
        const row = document.createElement('div');
        row.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 10px; border-bottom: 1px solid #eee; cursor: pointer;";
        row.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <img src="${item.sekilUrl}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">
                <div>
                    <strong style="color:#ffffff;">${item.ledAdi}</strong>
                    <div style="font-size:12px; color:#b0b3b8;">Qutu: ${item.qutuNomresi}${voltText}</div>
                </div>
            </div>
            <span style="background-color: #28a745; color: white; padding: 4px 8px; font-size: 12px; font-weight: bold; border-radius: 4px;">Seç</span>
        `;
        row.addEventListener('click', () => {
            selectedAnbarItemForZakaz = item;
            anbarSelectModal.style.display = 'none';
            countModalModelName.innerText = `${item.ledAdi} (Qutu: ${item.qutuNomresi})`;
            zakazCountInput.value = "1";
            countModal.style.display = 'flex';
        });
        m_anbarSelectContainer.appendChild(row);
    });
}

if (anbarSearchInput) {
    anbarSearchInput.addEventListener('input', (e) => {
        const txt = e.target.value.toUpperCase();
        const filtered = allAnbarItems.filter(item => item.ledAdi.includes(txt));
        anbarListesiniGoster(filtered);
    });
}

// ⚡ YENİLƏNMİŞ MODAL TƏSDİQ DÜYMƏSİ (HƏM ADD HƏM UPDATE ƏMƏLİYYATI ÜÇÜN)
if (btnConfirmZakaz) {
    btnConfirmZakaz.addEventListener('click', async () => {
        const count = zakazCountInput.value || 1;
        const isUpdateMode = btnConfirmZakaz.dataset.mode === "update";

        // A) Əgər "Sayı Dəyiş" rejimindədirsə (Firestore Update)
        if (isUpdateMode) {
            const targetId = btnConfirmZakaz.dataset.targetId;
            if (!targetId) return;

            try {
                btnConfirmZakaz.innerText = "Yenilənir...";
                btnConfirmZakaz.disabled = true;

                const docRef = doc(db, "ledler", targetId);
                await updateDoc(docRef, {
                    sifarisSayi: count
                });

                countModal.style.display = 'none';
                showToast("Sayı uğurla yeniləndi!");
                exitSelectionMode();
                ledleriGetir(searchInput ? searchInput.value : "");
            } catch (err) {
                showToast("Yenilənmə zamanı xəta oldu.", true);
            } finally {
                btnConfirmZakaz.disabled = false;
                delete btnConfirmZakaz.dataset.mode;
                delete btnConfirmZakaz.dataset.targetId;
                btnConfirmZakaz.innerText = "Sifariş Siyahısına Əlavə Et";
            }

        // B) Əgər yeni Zakaz əlavə olunursa (Firestore Add)
        } else {
            if (!selectedAnbarItemForZakaz) return;

            const exists = allLoadedZakazItems.some(item => 
                item.ledAdi.trim().toUpperCase() === selectedAnbarItemForZakaz.ledAdi.trim().toUpperCase()
            );

            if (exists) {
                showToast("Siyahıda artıq var!", true);
                countModal.style.display = 'none';
                return;
            }

            try {
                btnConfirmZakaz.innerText = "Əlavə edilir...";
                btnConfirmZakaz.disabled = true;
                const zakazData = {
                    ledAdi: selectedAnbarItemForZakaz.ledAdi.toUpperCase(), 
                    qutuNomresi: selectedAnbarItemForZakaz.qutuNomresi.toUpperCase(), 
                    volt: selectedAnbarItemForZakaz.volt || "", 
                    qiymet: selectedAnbarItemForZakaz.qiymet,
                    sekilUrl: selectedAnbarItemForZakaz.sekilUrl,
                    tarix: new Date().toISOString(),
                    status: "zakaz",
                    sifarisSayi: count
                };
                await addDoc(collection(db, "ledler"), zakazData);
                countModal.style.display = 'none';
                showToast("Sifarişə əlavə olundu!");
                if (tabZakaz) tabZakaz.click();
            } catch (err) {
                showToast("Xəta baş verdi.", true);
            } finally {
                btnConfirmZakaz.disabled = false;
                btnConfirmZakaz.innerText = "Sifariş Siyahısına Əlavə Et";
            }
        }
    });
}

async function ledleriGetir(searchQuery = "") {
    if (!ledList) return;
    
    if (loadingContainer) loadingContainer.style.display = 'flex';
    ledList.innerHTML = ""; 
    allLoadedZakazItems = []; 

    if (currentTab === "zakaz") {
        ledList.classList.add("zakaz-active-view");
    } else {
        ledList.classList.remove("zakaz-active-view");
    }

    try {
        const q = query(collection(db, "ledler"), orderBy("tarix", "desc"));
        const querySnapshot = await getDocs(q);
        
        ledList.innerHTML = "";
        let hansiSaLedTapildi = false;
        loadedZakazIds = []; 

        querySnapshot.forEach((docSnap) => {
            const id = docSnap.id;
            const data = docSnap.data();
            const itemStatus = data.status || "anbar";
            
            if (itemStatus !== currentTab) return;
            if (searchQuery && !data.ledAdi.includes(searchQuery.toUpperCase())) return;

            hansiSaLedTapildi = true;

            if (itemStatus === "zakaz") {
                loadedZakazIds.push(id); 
                allLoadedZakazItems.push({ id, ...data }); 

                const card = document.createElement('div');
                card.className = 'led-card zakaz-style';
                card.dataset.id = id;
                card.innerHTML = `
                    <h4>${data.ledAdi}</h4>
                    <span class="zakaz-count-badge">${data.sifarisSayi || 1} ədəd</span>
                `;

                card.addEventListener('click', () => {
                    if (!isSelectionMode) {
                        enterSelectionMode(id, card);
                    } else {
                        toggleItemSelection(id, card);
                    }
                });

                ledList.appendChild(card);

            } else {
                let displayPrice = data.qiymet;
                if (!displayPrice || displayPrice === "undefined") displayPrice = "Təyin edilməyib";
                else if(!isNaN(displayPrice)) displayPrice = displayPrice + " AZN";

                const voltBadge = data.volt ? `<p>Volt: <span class="volt-badge" style="background-color: #007bff; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 13px; margin-left: 4px;">${data.volt}</span></p>` : "";
                const currentImg = data.sekilUrl || "https://via.placeholder.com/150?text=Sekil+Yoxdur";

                const card = document.createElement('div');
                card.className = 'led-card';
                card.innerHTML = `
                    <h4>${data.ledAdi}</h4>
                    <p>Qutu: <span class="box-badge">${data.qutuNomresi}</span></p>
                    ${voltBadge}
                    <p>Qiymət: <span class="price-badge">${displayPrice}</span></p>
                    <img src="${currentImg}" alt="led-sekli">
                `;

                card.addEventListener('click', () => {
                    currentSelectedData = { id, ...data, status: itemStatus, sekilUrl: currentImg };
                    if (previewTitle) previewTitle.innerText = data.ledAdi;
                    if (previewImage) previewImage.src = currentImg;
                    if (previewBox) previewBox.innerText = data.qutuNomresi;
                    if (previewPrice) previewPrice.innerText = displayPrice;
                    
                    let previewVoltEl = document.getElementById('previewVolt');
                    if (previewVoltEl) {
                        previewVoltEl.innerText = data.volt || "Təyin edilməyib";
                    }

                    if (imagePreviewModal) imagePreviewModal.style.display = 'flex';
                });

                ledList.appendChild(card);
            }
        });

       if (!hansiSaLedTapildi) {
            let emptyMessage = "";

            if (currentTab === "anbar") {
                emptyMessage = searchQuery ? "Anbarda belə bir LED tapılmadı" : "Anbarda LED yoxdur";
            } else {
                emptyMessage = searchQuery ? "Zakazda belə bir LED tapılmadı" : "Sifariş olunacaq LED yoxdur";
            }

            ledList.innerHTML = `<p id="noLedMessage" class="empty-list-message">${emptyMessage}</p>`;
        }
    } catch (error) {
        ledList.innerHTML = "<p style='text-align:center; color:red; padding:20px; width: 100%;'>Xəta baş verdi.</p>";
    } finally {
        if (loadingContainer) loadingContainer.style.display = 'none';
    }
}

if (goToEditBtn) {
    goToEditBtn.addEventListener('click', () => {
        if (!currentSelectedData) return;
        if (modalTitle) modalTitle.innerText = "Məlumatı Redaktə Et";
        document.getElementById('ledName').value = currentSelectedData.ledAdi;
        document.getElementById('boxNumber').value = currentSelectedData.qutuNomresi;
        document.getElementById('ledPrice').value = currentSelectedData.qiymet === "Təyin edilməyib" ? "" : currentSelectedData.qiymet;
        document.getElementById('ledImageUrl').value = currentSelectedData.sekilUrl ? (currentSelectedData.sekilUrl.startsWith("data:image") ? "" : currentSelectedData.sekilUrl) : "";
        
        const voltInput = document.getElementById('ledVolt');
        if (voltInput) voltInput.value = currentSelectedData.volt || "";

        if (saveBtn) saveBtn.innerText = "Yenilə";
        if (deleteBtn) deleteBtn.style.display = "block";
        if (imagePreviewModal) imagePreviewModal.style.display = 'none';
        if (modal) modal.style.display = 'flex';
    });
}

if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
        const name = document.getElementById('ledName').value;
        const box = document.getElementById('boxNumber').value;
        const price = document.getElementById('ledPrice').value;
        const imageUrl = document.getElementById('ledImageUrl').value;
        
        const voltInput = document.getElementById('ledVolt');
        const volt = voltInput ? voltInput.value.trim().toUpperCase() : "";

        if(!name || !box) {
            showToast("Zəhmət olmasa LED adı və Qutu nömrəsini yazın!", true);
            return;
        }

        const isEditing = currentSelectedData && currentSelectedData.id;
        if (!isEditing && currentTab === "zakaz") {
            const exists = allLoadedZakazItems.some(item => 
                item.ledAdi.trim().toUpperCase() === name.trim().toUpperCase()
            );
            if (exists) {
                showToast("Siyahıda artıq var!", true);
                return;
            }
        }

        let finalImageUrl = "https://via.placeholder.com/150?text=Sekil+Yoxdur";
        if (base64Image) finalImageUrl = base64Image;
        else if (imageUrl) finalImageUrl = imageUrl;
        else if (currentSelectedData && currentSelectedData.sekilUrl) finalImageUrl = currentSelectedData.sekilUrl;

        try {
            saveBtn.innerText = "Gözləyin..."; saveBtn.disabled = true;
            const ledData = {
                ledAdi: name.toUpperCase(),
                qutuNomresi: box.toUpperCase(),
                volt: volt, 
                qiymet: price || "Təyin edilməyib",
                sekilUrl: finalImageUrl,
                tarix: new Date().toISOString(),
                status: currentSelectedData && currentSelectedData.status ? currentSelectedData.status : currentTab
            };
            if (currentSelectedData && currentSelectedData.id) {
                const docRef = doc(db, "ledler", currentSelectedData.id);
                await updateDoc(docRef, ledData);
                showToast("Məlumat uğurla yeniləndi!");
            } else {
                await addDoc(collection(db, "ledler"), ledData);
                showToast("Uğurla əlavə olundu!");
            }
            ledleriGetir(searchInput ? searchInput.value : "");
            setTimeout(() => { closeAndResetModal(); }, 1000);
        } catch (error) {
            showToast("Xəta baş verdi.", true);
        } finally {
            setTimeout(() => { 
                saveBtn.disabled = false; 
                if (currentSelectedData && currentSelectedData.id) {
                    saveBtn.innerText = "Yenilə";
                } else {
                    saveBtn.innerText = "Yadda saxla";
                }
            }, 1000);
        }
    });
}

if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
        if (!currentSelectedData || !currentSelectedData.id) return;
        if (!confirm("Bu məlumatı silmək istədiyinizə əminsiniz?")) return;
        try {
            const docRef = doc(db, "ledler", currentSelectedData.id);
            await deleteDoc(docRef);
            showToast("Məlumat silindi.");
            ledleriGetir(searchInput ? searchInput.value : "");
            closeAndResetModal();
        } catch (error) {
            showToast("Silinmədi.", true);
        }
    });
}

if (ledFileInput) {
    ledFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (fileSelectedName) fileSelectedName.innerText = `Seçildi: ${file.name}`;
            const reader = new FileReader();
            reader.onloadend = () => { base64Image = reader.result; };
            reader.readAsDataURL(file);
        }
    });
}

function closeAndResetModal() {
    document.getElementById('ledName').value = ""; 
    document.getElementById('boxNumber').value = ""; 
    document.getElementById('ledPrice').value = ""; 
    document.getElementById('ledImageUrl').value = "";
    
    const voltInput = document.getElementById('ledVolt');
    if (voltInput) voltInput.value = "";

    if (ledFileInput) ledFileInput.value = "";
    if (fileSelectedName) fileSelectedName.innerText = "";
    base64Image = ""; currentSelectedData = null;
    
    if (saveBtn) saveBtn.innerText = "Yadda saxla";
    if (modal) modal.style.display = 'none';
}

if (closeModalBtn) closeModalBtn.addEventListener('click', closeAndResetModal);
if (closePreviewBtn) closePreviewBtn.addEventListener('click', () => { if (imagePreviewModal) imagePreviewModal.style.display = 'none'; });

window.addEventListener('click', (e) => { 
    if (e.target === modal) closeAndResetModal(); 
    if (e.target === imagePreviewModal) imagePreviewModal.style.display = 'none';
    if (e.target === choiceModal) choiceModal.style.display = 'none';
    if (e.target === anbarSelectModal) anbarSelectModal.style.display = 'none';
    if (e.target === countModal) {
        delete btnConfirmZakaz.dataset.mode;
        delete btnConfirmZakaz.dataset.targetId;
        btnConfirmZakaz.innerText = "Sifariş Siyahısına Əlavə Et";
        countModal.style.display = 'none';
    }
});

if (searchInput) searchInput.addEventListener('input', (e) => ledleriGetir(e.target.value));

const fullImageModal = document.getElementById('fullImageModal'); 
const fullScreenImg = document.getElementById('fullScreenImg'); 
const previewImageEl = document.getElementById('previewImage'); 

if (previewImageEl) {
    previewImageEl.style.cursor = "pointer"; 
    previewImageEl.addEventListener('click', () => {
        if (previewImageEl.src && !previewImageEl.src.includes('placeholder')) { 
            fullScreenImg.src = previewImageEl.src; 
            fullImageModal.style.display = 'flex'; 
        }
    });
}

if (fullImageModal) {
    fullImageModal.addEventListener('click', () => {
        fullImageModal.style.display = 'none';
    });
}

if (btnSendWhatsApp) {
    btnSendWhatsApp.addEventListener('click', () => {
        const noLedMessage = document.getElementById('noLedMessage');

        if (allLoadedZakazItems.length === 0) {
            showToast("Göndəriləcək sifariş yoxdur!", true);
            
            if (noLedMessage) {
                noLedMessage.style.color = "#ff4d4d";
                noLedMessage.style.fontWeight = "bold";
                noLedMessage.style.transform = "scale(1.05)";
                noLedMessage.style.transition = "all 0.3s ease";
                
                setTimeout(() => {
                    noLedMessage.style.color = "#888";
                    noLedMessage.style.fontWeight = "normal";
                    noLedMessage.style.transform = "scale(1)";
                }, 2000);
            }
            return;
        }

        let message = "📝 *SİFARİŞ SİYAHISI* \n\n";
        
        const gonderilenler = new Set();
        let siralanma = 1;

        allLoadedZakazItems.forEach((item) => {
            const unikalAd = item.ledAdi.trim().toUpperCase();
            
            if (!gonderilenler.has(unikalAd)) {
                gonderilenler.add(unikalAd);
                const count = parseInt(item.sifarisSayi) || 1;
                const voltDetail = item.volt ? ` (${item.volt})` : "";
                message += `${siralanma}. *${unikalAd}*${voltDetail} ➔ *${count} ədəd*\n`;
                siralanma++;
            }
        });

        const encodedText = encodeURIComponent(message);
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
        
        window.open(whatsappUrl, '_blank');
    });
}

if (tabAnbar) {
    tabAnbar.classList.add('active');
    tabAnbar.style.backgroundColor = "#007bff"; 
    tabAnbar.style.color = "white";
}
ledleriGetir();

const btnOpenEasternStar = document.getElementById('btnOpenEasternStar');
const easternStarModal = document.getElementById('easternStarModal');
const closeEasternStarModal = document.getElementById('closeEasternStarModal');
const easternStarIframe = document.getElementById('easternStarIframe');

if (btnOpenEasternStar && easternStarModal && easternStarIframe) {
    btnOpenEasternStar.addEventListener('click', () => {
        easternStarIframe.src = 'https://www.eastern-star.com/';
        easternStarModal.style.display = 'flex';
    });
}

if (closeEasternStarModal && easternStarModal && easternStarIframe) {
    closeEasternStarModal.addEventListener('click', () => {
        easternStarModal.style.display = 'none';
        easternStarIframe.src = '';
    });
}

window.addEventListener('click', (e) => {
    if (e.target === easternStarModal) {
        easternStarModal.style.display = 'none';
        easternStarIframe.src = '';
    }
});

const voltInput = document.getElementById('ledVolt');
if (voltInput) {
    voltInput.addEventListener('blur', () => {
        let val = voltInput.value.trim();
        if (val && /^\d+(\.\d+)?$/.test(val)) {
            voltInput.value = val + 'V';
        }
    });
}