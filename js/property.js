import {
    getProperties,
    updateProperty,
    getCategories,
    syncProperties
} from "./database.js";
import floors from "./floor.js";

let draftChanges = {};


const propertyDetails = {};

async function getAllPropertyIds() {
    const allIds = [];

    for (const floor of floors) {
        try {
            const response = await fetch(floor.file);

            if (!response.ok) {
                console.error("Cannot load:", floor.file);
                continue;
            }

            const html = await response.text();

            // Read window.unitDetails from the floor HTML
            const match = html.match(/window\.unitDetails\s*=\s*({[\s\S]*?});/);

            if (match) {
                try {
                    const details = Function("return " + match[1])();

                    Object.assign(propertyDetails, details);

                } catch (e) {
                    console.error("Couldn't read unitDetails from", floor.file, e);
                }
            }

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");

            const units = doc.querySelectorAll("svg .unit");

            units.forEach(unit => {

                const id = unit.id.trim();


                if (!id) {
                    console.error("❌ Empty ID found in:", floor.file, unit);
                    return;
                }

                allIds.push(id);

            });

            console.log(`${floor.name}: ${units.length} units`);

        } catch (err) {
            console.error(`Failed to load ${floor.file}`, err);
        }
    }

    return allIds;
}


const propertyIds = await getAllPropertyIds();
// console.log(propertyDetails);

try {
    await syncProperties(propertyIds);
} catch (err) {
    console.error("SYNC ERROR:", err);
    console.error(err.stack);
}

// console.log(units);
const table = document.getElementById("propertyTable");
let selectedFloor = "1";
let searchText = "";
const searchInput = document.getElementById("propertySearch");

if (searchInput) {

    searchInput.addEventListener("input", () => {

        searchText = searchInput.value.toLowerCase();

        loadProperties();

    });

}

// ------------------------------

export async function loadProperties() {

    if (!table) return;

    table.innerHTML = "";

    const properties = await getProperties();
    const categories = await getCategories();

    const floorTabs = document.getElementById("floorTabs");

    if (floorTabs) {

        const floors = [...new Set(
            Object.keys(properties).map(id => parseProperty(id).floor)
        )];

        console.log("Properties:", Object.keys(properties));
        console.log("Parsed Floors:", floors);

        floors.sort((a, b) => {

            if (a === "LG") return -1;
            if (b === "LG") return 1;

            if (a === "G") return -1;
            if (b === "G") return 1;

            return Number(a) - Number(b);

        });
        if (!selectedFloor && floors.length > 0) {
            selectedFloor = floors[0];
        }
        floorTabs.innerHTML = "";


        floors.forEach(floor => {

            floorTabs.innerHTML +=
                `<button
            class="floor ${selectedFloor === floor ? "active" : ""}"
            data-floor="${floor}">
            ${floor == "LG" || floor == "G" ? floor : "F" + floor}
        </button>`;

        });

        floorTabs.querySelectorAll(".floor").forEach(btn => {

            btn.onclick = () => {

                selectedFloor = btn.dataset.floor;

                loadProperties();

            };

        });

    }

    let total = 0;
    let available = 0;
    let reserved = 0;
    let sold = 0;

    for (const [id, propertyData] of Object.entries(properties)) {
        const status = propertyData.status || "Available";
        const buyerName = propertyData.buyerName || "";
        const buyerPhone = propertyData.buyerPhone || "";

        const property = parseProperty(id);
        // Floor Filter
        if (
            selectedFloor &&
            property.floor !== selectedFloor
        ) {
            continue;
        }

        // Search Filter
        if (
            searchText &&
            !property.name.toLowerCase().includes(searchText)
        ) {
            continue;
        }

        total++;

        if (status === "Available") available++;
        if (status === "Reserved") reserved++;
        if (status === "Sold") sold++;


        const detail = propertyDetails[id] || {};
        const row = document.createElement("tr");

        row.innerHTML = `

<td>${property.floor === "LG" || property.floor === "G"
                ? property.floor
                : "F" + property.floor}</td>

<td>${property.name}</td>

<td>${property.unit}</td>

<td class="area">

    <div><strong>SA:</strong> ${detail.superArea || "-"}</div>

    <div><strong>CA:</strong> ${detail.carpetArea || "-"}</div>

</td>

<!-- Status Column -->
<td>
    <select data-id="${id}"></select>
</td>

<!-- Buyer Information Column -->
<td>

<div class="buyer-card">

    <div class="buyer-fields">

        <div class="field">

            <label>Buyer Name</label>

            <input
                class="buyerName"
                placeholder="Enter buyer name"
                value="${buyerName}">

        </div>

        <div class="field">

            <label>Phone Number</label>

            <input
                class="buyerPhone"
                placeholder="Enter phone number"
                value="${buyerPhone}">

        </div>

    </div>


</div>

</td>

`;

        const select = row.querySelector("select");
        const buyerNameInput = row.querySelector(".buyerName");
        const buyerPhoneInput = row.querySelector(".buyerPhone");
        // saveBuyer.onclick = async () => {

        //     await updateProperty(

        //         id,

        //         select.value,

        //         buyerNameInput.value,

        //         buyerPhoneInput.value

        //     );

        //     loadProperties();

        // };

        Object.keys(categories).forEach(category => {

            const option = document.createElement("option");

            option.value = category;

            option.textContent = category;

            if (category === status)
                option.selected = true;

            select.appendChild(option);

        });

        // select.onchange = async () => {

        //     await updateProperty(

        //         id,

        //         select.value,

        //         buyerNameInput.value,

        //         buyerPhoneInput.value

        //     );

        //     loadProperties();

        // };
        function saveDraft() {

            draftChanges[id] = {

                status: select.value,
                buyerName: buyerNameInput.value.trim(),
                buyerPhone: buyerPhoneInput.value.trim()

            };

            if (saveBtn) saveBtn.disabled = false;
            if (cancelBtn) cancelBtn.disabled = false;

        }

        select.onchange = saveDraft;

        buyerNameInput.oninput = saveDraft;

        buyerPhoneInput.oninput = saveDraft;
        table.appendChild(row);

    }

    document.getElementById("floorTotal").textContent = total;
    document.getElementById("floorAvailable").textContent = available;
    document.getElementById("floorReserved").textContent = reserved;
    document.getElementById("floorSold").textContent = sold;

}
function parseProperty(id) {

    // Decode SVG encoded numbers
    let clean = id
        .replace(/_x31_0/g, "10")
        .replace(/_x31_1/g, "11")
        .replace(/_x31_2/g, "12")
        .replace(/_x31_3/g, "13")
        .replace(/_x31_4/g, "14")
        .replace(/_x31_5/g, "15")
        .replace(/_x31_6/g, "16")
        .replace(/_x31_7/g, "17")
        .replace(/_x31_8/g, "18")
        .replace(/_x39_/g, "9")
        .replace(/_x38_/g, "8")
        .replace(/_x37_/g, "7")
        .replace(/_x36_/g, "6")
        .replace(/_x35_/g, "5")
        .replace(/_x34_/g, "4")
        .replace(/_x33_/g, "3")
        .replace(/_x32_/g, "2")
        .replace(/_x31_/g, "1")
        .replace(/_x5F_/g, "_");

    const parts = clean.split("_");

    return {
        id,
        floor: parts[0],
        unit: parts.at(-1),
        name: parts.slice(1, -1).join(" ")
    };
}

export async function updateFloorColors() {

    const properties = await getProperties();
    console.log(properties);

    document.querySelectorAll(".unit").forEach(unit => {

        const status = properties[unit.id]?.status;

        switch (status) {

            // case "Available":
            //     unit.style.fill = "#00C853";
            //     break;

            // case "Reserved":
            //     unit.style.fill = "#FFC107";
            //     break;

            // case "Sold":
            //     unit.style.fill = "#F44336";
            //     break;

            // default:
            //     unit.style.fill = "#BDBDBD";
            case "Available":
                unit.style.fill = "rgba(0, 200, 83, 0.35)";
                break;

            case "Reserved":
                unit.style.fill = "rgba(255, 193, 7, 0.35)";
                break;

            case "Sold":
                unit.style.fill = "rgba(244, 67, 54, 0.35)";
                break;
        }

    });

}

// document.getElementById("saveChanges").onclick = async () => {

//     for (const [id, data] of Object.entries(draftChanges)) {

//         await updateProperty(

//             id,

//             data.status,

//             data.buyerName,

//             data.buyerPhone

//         );

//     }

//     draftChanges = {};

//     await loadProperties();

// };
const saveBtn = document.getElementById("saveChanges");

if (saveBtn) {

    saveBtn.onclick = async () => {

        try {

            for (const [id, data] of Object.entries(draftChanges)) {

                await updateProperty(

                    id,
                    data.status,
                    data.buyerName,
                    data.buyerPhone

                );

            }

            draftChanges = {};

            await loadProperties();

            saveBtn.disabled = true;
            cancelBtn.disabled = true;



            alert("Changes saved successfully.");

        } catch (err) {

            console.error(err);

            alert("Failed to save changes.");

        }

    };

}

const cancelBtn = document.getElementById("cancelChanges");

if (cancelBtn) {

    cancelBtn.onclick = async () => {

        draftChanges = {};

        await loadProperties();
        saveBtn.disabled = true;
        cancelBtn.disabled = true;

    };

}

if (saveBtn) {
    saveBtn.disabled = true;
}

if (cancelBtn) {
    cancelBtn.disabled = true;
}