import { getProperties, getCategories } from "./database.js";

function hexToRgba(hex, alpha = 0.35) {
    const value = String(hex || "").trim().replace("#", "");
    if (!/^[0-9a-fA-F]{6}$/.test(value)) return `rgba(100,116,139,${alpha})`;
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

export async function updateFloorColors(properties = null) {
    const data = properties || await getProperties();
    const categories = await getCategories();

    document.querySelectorAll(".unit").forEach(unit => {
        const status = data[unit.id]?.status;
        const color = categories[status];

        if (color) {
            unit.style.fill = hexToRgba(color, 0.35);
            unit.style.stroke = hexToRgba(color, 0.9);
            unit.dataset.status = status;
        } else {
            unit.style.fill = "transparent";
            unit.style.stroke = "transparent";
            delete unit.dataset.status;
        }
    });
}
