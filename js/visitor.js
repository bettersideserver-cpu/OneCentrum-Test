const nameInput = document.getElementById("name");
const phoneInput = document.getElementById("phone");
const emailInput = document.getElementById("email");
const cityInput = document.getElementById("city");
import {
    addVisitor,
    getVisitor,
    getProperties,
    getCategories,
    checkExpiredVisitors,
    initializeDatabase,
    listenProperties,
    addPropertyRequest
} from "./database.js";

import {
    updateFloorColors
} from "./floorColor.js";

// ==========================
// Elements
// ==========================

const popup = document.getElementById("popup");
const closePopup = document.getElementById("closePopup");
const visitorForm = document.getElementById("visitorForm");

const waiting = document.getElementById("waitingScreen");

const verify = document.getElementById("verifyScreen");
const verifyBtn = document.getElementById("verifyBtn");
const verifyPhone = document.getElementById("verifyPhone");

const expired = document.getElementById("expiredScreen");

const reRegisterBtn = document.getElementById("reRegisterBtn");

const floor = document.getElementById("floorWrapper");

const timer = document.getElementById("timer");

const tooltip = document.getElementById("tooltip");

const holdPopup = document.getElementById("holdPopup");
const holdPropertyName = document.getElementById("holdPropertyName");

const holdYes = document.getElementById("holdYes");
const holdNo = document.getElementById("holdNo");

let selectedUnit = null;
let selectedInfo = null;

const legend = document.getElementById("legend");

// ==========================
// This script is shared between the building
// overview (index.html) and the individual
// floor pages. Not every element exists on
// every page, so every reference above may be
// null depending on which page loaded it.
// ==========================
closePopup?.addEventListener("click", () => {

    // Stop checking visitor status
    stopPolling();

    // Remove pending redirect
    localStorage.removeItem("pendingFloorRedirect");

    // Close every popup
    hideAll();

});
const cities = [
    "Amritsar",
    "Barnala",
    "Batala",
    "Bathinda",
    "Chandigarh",
    "Faridkot",
    "Fatehgarh Sahib",
    "Fazilka",
    "Ferozepur",
    "Gurdaspur",
    "Hoshiarpur",
    "Jalandhar",
    "Kapurthala",
    "Khanna",
    "Kharar",
    "Kotkapura",
    "Ludhiana",
    "Malerkotla",
    "Mansa",
    "Moga",
    "Mohali",
    "Muktsar",
    "Nabha",
    "Nawanshahr",
    "Pathankot",
    "Patiala",
    "Rajpura",
    "Rupnagar",
    "Samrala",
    "Sangrur",
    "Sirhind",
    "Sunam",
    "Zirakpur"
];

let timerInterval;
let pollInterval = null;

let properties = await getProperties();

updateFloorColors(properties);
let categories = await getCategories();

const isMobileUnitInteraction = () =>
    window.matchMedia("(pointer: coarse), (max-width: 768px)").matches;

function getHoldElements() {
    return {
        popup: document.getElementById("holdPopup"),
        propertyName: document.getElementById("holdPropertyName")
    };
}

function showUnitTooltip(unit, event) {

    if (!tooltip) return;

    const status = properties[unit.id]?.status || "Unknown";
    const info = window.unitDetails?.[unit.id];

    // Keep the tooltip inside the phone viewport.
    const x = Math.min(
        (event.clientX || window.innerWidth / 2) + 12,
        window.innerWidth - Math.min(300, window.innerWidth * 0.8) - 10
    );

    const y = Math.min(
        (event.clientY || window.innerHeight / 2) + 12,
        window.innerHeight - 170
    );

    tooltip.style.display = "block";
    tooltip.style.left = Math.max(10, x) + "px";
    tooltip.style.top = Math.max(10, y) + "px";

    // On touch devices the tooltip itself must be clickable.
    tooltip.style.pointerEvents = isMobileUnitInteraction() ? "auto" : "none";

    const categoriesNow = categories || {};
    const statusColor = categoriesNow[status] || "#999";

    tooltip.innerHTML = `
        <strong>${unit.id.replace(/_x5F_/g, " ").replace(/_/g, " ")}</strong>

        ${info ? `
            <br>
            Super Area : ${info.superArea}
            <br>
            Carpet Area : ${info.carpetArea}
        ` : ""}

        <br>
        Status :
        <span style="color:${statusColor};font-weight:700;">
            ${status}
        </span>

        ${status === "Available" ? `
            <br><br>
            <button type="button" class="holdBtn">Request to Hold</button>
        ` : ""}
    `;

    // IMPORTANT: the button is created dynamically, so its listener
    // must be attached after innerHTML is assigned.
    const holdBtn = tooltip.querySelector(".holdBtn");

    if (holdBtn) {
        holdBtn.addEventListener("click", async (e) => {

            e.preventDefault();
            e.stopPropagation();

            selectedUnit = unit.id;
            selectedInfo = window.unitDetails?.[unit.id];

            const hold = getHoldElements();

            if (!hold.popup) {
                alert("Hold request is still loading. Please try again.");
                return;
            }

            if (hold.propertyName) {
                hold.propertyName.textContent =
                    selectedInfo?.unit || unit.id;
            }

            tooltip.style.display = "none";
            hold.popup.style.display = "flex";
        });
    }
}

document.querySelectorAll(".unit").forEach(unit => {

    unit.addEventListener("mousemove", (e) => {

        // Desktop: normal hover tooltip.
        if (!isMobileUnitInteraction()) {
            showUnitTooltip(unit, e);
        }

    });

    unit.addEventListener("mouseleave", () => {

        if (!isMobileUnitInteraction() && tooltip) {
            tooltip.style.display = "none";
        }

    });

    unit.addEventListener("click", (e) => {

        if (properties[unit.id]?.status !== "Available") {

            alert("This property is not available.");
            return;

        }

        selectedUnit = unit.id;
        selectedInfo = window.unitDetails?.[unit.id];

        // MOBILE:
        // First tap = show the tooltip.
        // The user then taps "Request to Hold" INSIDE the tooltip.
        // Do not open the Yes/No overlay from the SVG tap itself.
        if (isMobileUnitInteraction()) {

            showUnitTooltip(unit, e);
            return;

        }

        // DESKTOP:
        // Preserve the existing click -> Yes/No hold confirmation.
        const hold = getHoldElements();

        if (!hold.popup) {
            alert("Hold request is still loading. Please try again.");
            return;
        }

        if (hold.propertyName) {
            hold.propertyName.textContent =
                selectedInfo?.unit || unit.id;
        }

        hold.popup.style.display = "flex";

    });

});

// Tap outside the mobile tooltip to close it.
document.addEventListener("click", (e) => {

    if (!isMobileUnitInteraction() || !tooltip) return;

    if (
        tooltip.style.display === "block" &&
        !tooltip.contains(e.target) &&
        !e.target.closest(".unit")
    ) {
        tooltip.style.display = "none";
    }

});

// ==========================
// Hide only the modal / overlay screens.
// The building view itself stays visible at
// all times now, the registration form only
// appears as a popup ON TOP of it.
// ==========================

function hideAll() {

    popup?.style && (popup.style.display = "none");
    waiting?.style && (waiting.style.display = "none");
    verify?.style && (verify.style.display = "none");
    expired?.style && (expired.style.display = "none");
    timer?.style && (timer.style.display = "none");

}

function stopPolling() {

    clearInterval(pollInterval);
    pollInterval = null;

}

// ==========================
// Registration
// ==========================

visitorForm?.addEventListener("submit", async (e) => {

    e.preventDefault();

    const visitor = await addVisitor(
        nameInput.value.trim(),
        phoneInput.value.trim(),
        emailInput.value.trim(),
        cityInput?.value.trim()
    );

    localStorage.setItem(
        "currentVisitor",
        visitor.id
    );

    hideAll();

    waiting.style.display = "flex";

    const targetUrl = localStorage.getItem("pendingFloorRedirect");

    if (targetUrl) {

        stopPolling();

        checkFlowStatus(targetUrl);

        pollInterval = setInterval(() => {
            checkFlowStatus(targetUrl);
        }, 1000);

    }

});

// ==========================
// Floor Access Flow
// Triggered when the visitor clicks a floor on
// the building SVG (see script.js). Shows the
// registration / waiting / verify screens as
// needed, then redirects to the requested
// floor page once verified.
// ==========================

async function checkFlowStatus(targetUrl) {

    checkExpiredVisitors();

    const id = localStorage.getItem("currentVisitor");

    if (!id) {

        stopPolling();
        hideAll();
        popup.style.display = "flex";

        return;

    }

    const visitor = await getVisitor(id);

    if (!visitor) {

        localStorage.removeItem("currentVisitor");

        stopPolling();
        hideAll();
        popup.style.display = "flex";

        return;

    }

    switch (visitor.status) {

        case "Pending":

            hideAll();

            waiting.style.display = "flex";

            break;

        case "Approved":

            if (localStorage.getItem("verified")) {

                stopPolling();
                hideAll();

                localStorage.removeItem("pendingFloorRedirect");

                window.location.href = targetUrl;

            } else {

                hideAll();

                verify.style.display = "flex";

            }

            break;

        case "Rejected":

            stopPolling();

            localStorage.removeItem("currentVisitor");
            localStorage.removeItem("verified");
            localStorage.removeItem("pendingFloorRedirect");

            hideAll();

            alert("Your request has been rejected.");

            popup.style.display = "flex";

            break;

        case "Expired":

            stopPolling();

            hideAll();

            expired.style.display = "flex";

            break;

    }

}

// Called from script.js when a floor on the
// building SVG is clicked.
window.requestFloorAccess = function (targetUrl) {

    if (!popup) {

        // Not on a page that has the registration
        // popup (e.g. an individual floor page) —
        // just navigate directly.
        window.location.href = targetUrl;
        return;

    }

    localStorage.setItem("pendingFloorRedirect", targetUrl);

    stopPolling();

    checkFlowStatus(targetUrl);

    pollInterval = setInterval(() => {
        checkFlowStatus(targetUrl);
    }, 1000);

};

// ==========================
// Verify
// ==========================

verifyBtn?.addEventListener("click", async () => {

    const id = localStorage.getItem("currentVisitor");

    const visitor = await getVisitor(id);

    if (!visitor) return;

    if (verifyPhone.value.trim() != visitor.phone) {

        alert("Wrong Phone Number");

        return;

    }

    localStorage.setItem(

        "verified",

        "true"

    );

    stopPolling();

    hideAll();

    const targetUrl = localStorage.getItem("pendingFloorRedirect");

    if (targetUrl) {

        localStorage.removeItem("pendingFloorRedirect");

        window.location.href = targetUrl;

    } else if (floor) {

        await openFloor(visitor);

    }

});

// ==========================
// Open Floor (used on individual floor pages
// where there is no building overview / popup
// gate, only a timer for the granted access time)
// ==========================

async function openFloor(visitor) {

    hideAll();

    if (floor) {

        floor.style.display = "block";

    }

    // Load legend
    const categories = await getCategories();

    if (legend) {

        legend.innerHTML = "";

        Object.entries(categories).forEach(([name, color]) => {

            legend.innerHTML += `
                <div class="legend-item">
                    <span class="legend-color" style="background:${color}"></span>
                    <span>${name}</span>
                </div>
            `;

        });

    }

    // Color SVG
    await updateFloorColors();

    startTimer(visitor);
}

// ==========================
// Timer
// ==========================

function startTimer(visitor) {

    clearInterval(timerInterval);

    if (timer) {

        timer.style.display = "block";

    }

    function updateTimer() {

        const left = visitor.expiresAt - Date.now();

        if (left <= 0) {

            clearInterval(timerInterval);

            localStorage.removeItem("verified");

            hideAll();

            if (expired) {
                expired.style.display = "flex";
            }

            return;
        }

        const totalSeconds = Math.floor(left / 1000);

        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;

        if (timer) {
            timer.textContent =
                `${String(h).padStart(2, "0")}:` +
                `${String(m).padStart(2, "0")}:` +
                `${String(s).padStart(2, "0")}`;
        }
    }

    // Show immediately
    updateTimer();

    // Then update every second
    timerInterval = setInterval(updateTimer, 1000);

}

// ==========================
// SVG
// ==========================

async function colorSVG() {

    const properties = await getProperties();
    const categories = await getCategories();

    legend.innerHTML = "";

    Object.entries(categories).forEach(([name, color]) => {

        const item = document.createElement("div");

        item.className = "legend-item";

        item.innerHTML =

            `<span class="legend-color"
        style="background:${color}">
        </span>${name}`;

        legend.appendChild(item);

    });

    Object.entries(properties).forEach(([id, status]) => {

        const unit = document.getElementById(id);

        if (!unit) return;

        unit.style.fill =

            categories[status];

        unit.onmousemove = (e) => {

            tooltip.style.display = "block";

            tooltip.style.left = e.clientX + 15 + "px";

            tooltip.style.top = e.clientY + 15 + "px";

            const info = window.unitDetails?.[id];

            tooltip.innerHTML = `
    <strong>${id.replace(/_x5F_/g, " ").replace(/_/g, " ")}</strong>

    ${info ? `
        <br>
        Super Area : ${info.superArea}
        <br>
        Carpet Area : ${info.carpetArea}
    ` : ""}

    <br>
    Status : ${status}
`;

        };

        unit.onmouseleave = () => {

            tooltip.style.display = "none";

        };

    });

}

// ==========================
// Path back to the building overview.
// Floor pages live at svg/pages/<floor>/<floor>.html,
// three levels below the project root.
// ==========================

const HOME_URL = "../../../index.html";

// ==========================
// Access Guard (individual floor pages only)
// Runs before anything is shown. A visitor must
// have an Approved + verified session with time
// left, or they're sent back to the homepage to
// register / wait / verify. This lets an approved
// visitor freely bounce between the homepage and
// any floor, as many times as they like, until
// their granted time limit runs out.
// ==========================

async function guardFloorPage() {

    // A floor page should never act on a redirect
    // that was meant for the homepage — drop it so
    // it can't cause a stale/duplicated navigation.
    localStorage.removeItem("pendingFloorRedirect");

    checkExpiredVisitors();

    const id = localStorage.getItem("currentVisitor");

    if (!id) {
        window.location.href = HOME_URL;
        return false;
    }

    const visitor = await getVisitor(id);

    if (!visitor || visitor.status === "Rejected") {

        localStorage.removeItem("currentVisitor");
        localStorage.removeItem("verified");

        window.location.href = HOME_URL;
        return false;

    }

    if (visitor.status === "Pending") {
        window.location.href = HOME_URL;
        return false;
    }

    if (!localStorage.getItem("verified")) {
        // Approved but never completed phone verification
        // in this session (e.g. floor URL opened directly).
        window.location.href = HOME_URL;
        return false;
    }

    if (
        visitor.status === "Expired" ||
        (visitor.expiresAt && visitor.expiresAt <= Date.now())
    ) {

        localStorage.removeItem("verified");
        window.location.href = HOME_URL + "?expired=1";
        return false;

    }

    // Approved, verified, and still has time left.
    await openFloor(visitor);

    // Keep watching the clock while they browse this
    // floor — if time runs out mid-visit, kick them
    // back to the homepage automatically.
    clearInterval(pollInterval);

    pollInterval = setInterval(async () => {

        if (visitor.expiresAt && visitor.expiresAt <= Date.now()) {

            stopPolling();

            await checkExpiredVisitors();

            localStorage.removeItem("verified");

            window.location.href = HOME_URL + "?expired=1";

        }

    }, 1000);

    return true;

}

// ==========================
// Initial Load
// The building overview is shown immediately —
// no registration gate on load there. Individual
// floor pages are gated by guardFloorPage() above.
// ==========================

(async () => {

    await initializeDatabase();

    checkExpiredVisitors();

    hideAll();

    if (floor && !popup) {

        // Individual floor page (no registration popup
        // here — that only exists on the homepage) — gate access.
        await guardFloorPage();

        return;

    }

    // Building overview (homepage). If the visitor
    // already has an Expired/Rejected session from a
    // previous visit, or just got redirected back here
    // because their time ran out, let them know instead
    // of staying silent.
    const currentId = localStorage.getItem("currentVisitor");

    if (currentId && popup) {

        const visitor = await getVisitor(currentId);

        if (visitor && visitor.status === "Expired" && expired) {

            hideAll();
            expired.style.display = "flex";

        } else if (visitor && visitor.status === "Rejected") {

            localStorage.removeItem("currentVisitor");
            localStorage.removeItem("verified");

        }

    }

    // If the visitor is already verified & approved
    // and had a pending floor they were headed to
    // (e.g. they reloaded mid-flow), send them on.
    const pendingUrl = localStorage.getItem("pendingFloorRedirect");

    if (pendingUrl && currentId && localStorage.getItem("verified")) {

        const visitor = await getVisitor(currentId);

        if (visitor && visitor.status === "Approved" && visitor.expiresAt > Date.now()) {

            localStorage.removeItem("pendingFloorRedirect");

            window.location.href = pendingUrl;

            return;

        }

    }

    // Visitor is Approved + verified and has no pending
    // floor redirect (e.g. they're just browsing the
    // homepage overview, or came back to it from a floor
    // page). Show the countdown timer here too, same as
    // it shows on individual floor pages, so they always
    // know how much access time is left.
    if (currentId && localStorage.getItem("verified")) {

        const visitor = await getVisitor(currentId);

        if (
            visitor &&
            visitor.status === "Approved" &&
            visitor.expiresAt &&
            visitor.expiresAt > Date.now()
        ) {

            startTimer(visitor);

            clearInterval(pollInterval);

            pollInterval = setInterval(async () => {

                if (visitor.expiresAt && visitor.expiresAt <= Date.now()) {

                    stopPolling();

                    await checkExpiredVisitors();

                    localStorage.removeItem("verified");

                    hideAll();

                    if (expired) {
                        expired.style.display = "flex";
                    }

                }

            }, 1000);

        }

    }

    await updateFloorColors();

})();

listenProperties((data) => {

    properties = data;

    updateFloorColors(properties);

});

reRegisterBtn?.addEventListener("click", () => {

    localStorage.removeItem("currentVisitor");
    localStorage.removeItem("verified");

    hideAll();

    popup.style.display = "flex";

});


const citySuggestions = document.getElementById("citySuggestions");

if (cityInput && citySuggestions) {

    cityInput.addEventListener("input", () => {

        const value = cityInput.value.toLowerCase().trim();

        citySuggestions.innerHTML = "";

        if (!value) {

            citySuggestions.style.display = "none";
            return;

        }

        const filtered = cities.filter(city =>
            city.toLowerCase().includes(value)
        );

        filtered.forEach(city => {

            const div = document.createElement("div");

            div.className = "city-item";

            div.textContent = "📍 " + city;

            div.onclick = () => {

                cityInput.value = city;

                citySuggestions.style.display = "none";

            };

            citySuggestions.appendChild(div);

        });

        citySuggestions.style.display =
            filtered.length ? "block" : "none";

    });

    document.addEventListener("click", e => {

        if (!citySuggestions.contains(e.target) &&
            e.target !== cityInput) {

            citySuggestions.style.display = "none";

        }

    });
}
document.addEventListener("click", async (e) => {

    const holdNo = e.target.closest("#holdNo");
    const holdYes = e.target.closest("#holdYes");

    if (!holdNo && !holdYes) return;

    const holdPopup = document.getElementById("holdPopup");

    if (holdNo) {
        if (holdPopup) holdPopup.style.display = "none";
        return;
    }

    if (!holdYes) return;

    const visitorId = localStorage.getItem("currentVisitor");

    if (!visitorId) {

        alert("Please register first.");

        if (holdPopup) holdPopup.style.display = "none";

        return;
    }

    const visitor = await getVisitor(visitorId);

    if (!visitor) {

        alert("Visitor not found.");

        if (holdPopup) holdPopup.style.display = "none";

        return;
    }

    await addPropertyRequest({

        visitorId: visitor.id,
        visitorName: visitor.name,
        phone: visitor.phone,
        email: visitor.email,
        city: visitor.city,

        propertyId: selectedUnit,
        property: selectedInfo?.unit || selectedUnit,
        floor: selectedUnit.split("_")[0],
        unit: selectedUnit.split("_").pop(),

        status: "Pending",

        requestedAt: Date.now()

    });

    if (holdPopup) holdPopup.style.display = "none";

    alert("✅ Property request sent successfully.");

});
