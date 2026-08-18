// Unified Supabase data layer.
// Unified database layer preserving
// the function names used by the existing BetterSide frontend.

import { supabase } from './supabase.js';

const VISITOR_TABLE = 'visitors';
const UNIT_TABLE = 'units';
const STATUS_TABLE = 'status_categories';
const REQUEST_TABLE = 'property_requests';

let initialized = false;

export async function initDatabase() {
    if (!initialized) {
        // The client is created once in supabase.js. Keep this function so
        // existing pages can continue calling initializeDatabase/initDatabase.
        initialized = true;
    }
    return { mode: 'supabase' };
}

export async function initializeDatabase() {
    return initDatabase();
}

export function getMode() {
    return 'supabase';
}

function publicVisitorId() {
    if (globalThis.crypto?.randomUUID) {
        return `USER-${crypto.randomUUID()}`;
    }
    return `USER-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toLegacyProperty(unit, statusMap) {
    const status = statusMap.get(unit.status_id);
    return {
        unitId: unit.id,
        svgId: unit.svg_id,
        status: status?.name || unit.status_id || 'Available',
        buyerName: unit.buyer_name || '',
        buyerPhone: unit.buyer_phone || '',
        superArea: unit.super_area || '',
        carpetArea: unit.carpet_area || '',
        area: unit.area ?? null,
        price: unit.price ?? null,
        floor: unit.floor || '',
        unitType: unit.unit_type || '',
        unitNumber: unit.unit_number || ''
    };
}

// =======================================
// Status categories
// =======================================

export async function getCategories() {
    const { data, error } = await supabase
        .from(STATUS_TABLE)
        .select('id,name,color,active,sort_order')
        .eq('active', true)
        .order('sort_order', { ascending: true });

    if (error) throw error;

    const categories = {};
    for (const item of data || []) categories[item.name] = item.color;
    return categories;
}

export async function getStatuses() {
    const { data, error } = await supabase
        .from(STATUS_TABLE)
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
}

function slugifyStatusId(name) {
    return String(name)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || `status-${Date.now()}`;
}

export async function addCategory(name, color) {
    const id = slugifyStatusId(name);
    const { data: existing } = await supabase
        .from(STATUS_TABLE)
        .select('id')
        .eq('id', id)
        .maybeSingle();

    const finalId = existing ? `${id}-${Date.now().toString(36)}` : id;

    const { data, error } = await supabase
        .from(STATUS_TABLE)
        .insert({
            id: finalId,
            name: name.trim(),
            color,
            active: true
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateCategory(id, name, color) {
    const { data, error } = await supabase
        .from(STATUS_TABLE)
        .update({ name: name.trim(), color })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteCategory(nameOrId, replacementId = null) {
    let id = nameOrId;

    const { data: byId } = await supabase
        .from(STATUS_TABLE)
        .select('id')
        .eq('id', nameOrId)
        .maybeSingle();

    if (!byId) {
        const { data: byName, error: nameError } = await supabase
            .from(STATUS_TABLE)
            .select('id')
            .eq('name', nameOrId)
            .maybeSingle();
        if (nameError) throw nameError;
        if (!byName) throw new Error('Status not found.');
        id = byName.id;
    }

    if (!replacementId) {
        const statuses = await getStatuses();
        const replacement = statuses.find(s => s.id !== id);
        replacementId = replacement?.id;
    }

    if (!replacementId || replacementId === id) {
        throw new Error('A replacement status is required before deleting this status.');
    }

    await saveStatusReplacement(id, replacementId);

    const { error } = await supabase
        .from(STATUS_TABLE)
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
}

async function saveStatusReplacement(id, replacementId) {
    const { error } = await supabase
        .from(UNIT_TABLE)
        .update({
            status_id: replacementId,
            updated_at: new Date().toISOString()
        })
        .eq('status_id', id);

    if (error) throw error;
}

// =======================================
// Units / properties
// =======================================

export async function getUnits(floor = null) {
    let query = supabase
        .from(UNIT_TABLE)
        .select('*')
        .order('floor')
        .order('unit_number');

    if (floor) query = query.eq('floor', floor);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

export async function getProperties() {
    const [unitsResult, statusesResult] = await Promise.all([
        supabase.from(UNIT_TABLE).select('*').order('floor').order('unit_number'),
        supabase.from(STATUS_TABLE).select('id,name,color,active,sort_order')
    ]);

    if (unitsResult.error) throw unitsResult.error;
    if (statusesResult.error) throw statusesResult.error;

    const statusMap = new Map((statusesResult.data || []).map(item => [item.id, item]));
    const properties = {};

    for (const unit of unitsResult.data || []) {
        properties[unit.svg_id] = toLegacyProperty(unit, statusMap);
    }

    return properties;
}

export async function updateProperty(id, status, buyerName = '', buyerPhone = '') {
    let statusId = null;

    const { data: statusRow, error: statusError } = await supabase
        .from(STATUS_TABLE)
        .select('id')
        .eq('name', status)
        .maybeSingle();

    if (statusError) throw statusError;
    statusId = statusRow?.id;

    if (!statusId) {
        throw new Error(`Status "${status}" does not exist.`);
    }

    const { error } = await supabase
        .from(UNIT_TABLE)
        .update({
            status_id: statusId,
            buyer_name: buyerName || '',
            buyer_phone: buyerPhone || '',
            updated_at: new Date().toISOString()
        })
        .eq('svg_id', id);

    if (error) throw error;
}

export async function saveUnitStatuses(changes) {
    for (const change of changes || []) {
        const { error } = await supabase
            .from(UNIT_TABLE)
            .update({
                status_id: change.status_id,
                updated_at: new Date().toISOString()
            })
            .eq('id', change.id);

        if (error) throw error;
    }
    return getUnits();
}

export async function syncProperties() {
    // Units are seeded/migrated in Supabase SQL. Client-side document creation is intentionally removed.
    return true;
}

export async function listenProperties(callback) {
    await initDatabase();

    const channel = supabase
        .channel(`property-inventory-${Math.random().toString(36).slice(2)}`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: UNIT_TABLE },
            async () => callback(await getProperties())
        )
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: STATUS_TABLE },
            async () => callback(await getProperties())
        )
        .subscribe();

    return () => supabase.removeChannel(channel);
}

export function subscribeToInventory(callback) {
    return listenProperties(async () => callback({ type: 'inventory-updated' }));
}

// =======================================
// Visitors
// =======================================

export async function addVisitor(name, phone, email, city) {
    const visitor = {
        public_id: publicVisitorId(),
        name,
        phone,
        email,
        city: city || '',
        status: 'Pending',
        access_time: 5,
        created_at: new Date().toISOString(),
        expires_at: null
    };

    const { error } = await supabase
        .from(VISITOR_TABLE)
        .insert(visitor);

    if (error) {
        console.error('Visitor registration failed:', error);
        throw error;
    }

    // Return the visitor locally.
    // We intentionally do NOT select the row back from
    // Supabase because anonymous users should not have
    // SELECT access to the visitors table.
    return {
        id: visitor.public_id,
        name: visitor.name,
        phone: visitor.phone,
        email: visitor.email,
        city: visitor.city,
        status: visitor.status,
        accessTime: visitor.access_time,
        createdAt: new Date(visitor.created_at).getTime(),
        expiresAt: null
    };
}

export async function getVisitor(id) {
    const { data, error } = await supabase.rpc('get_public_visitor', {
        p_public_id: id
    });

    if (error) throw error;
    const visitor = Array.isArray(data) ? data[0] : data;
    if (!visitor) return null;

    return {
        id: visitor.public_id,
        name: visitor.name,
        phone: visitor.phone,
        email: visitor.email,
        city: visitor.city || '',
        status: visitor.status,
        accessTime: visitor.access_time,
        createdAt: visitor.created_at ? new Date(visitor.created_at).getTime() : null,
        expiresAt: visitor.expires_at ? new Date(visitor.expires_at).getTime() : null
    };
}

function mapVisitor(row) {
    return {
        docId: row.id,
        id: row.public_id,
        name: row.name,
        phone: row.phone,
        email: row.email,
        city: row.city || '',
        status: row.status,
        accessTime: row.access_time,
        createdAt: row.created_at ? new Date(row.created_at).getTime() : null,
        expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : null
    };
}

export async function getVisitors() {
    const { data, error } = await supabase
        .from(VISITOR_TABLE)
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapVisitor);
}

export async function approveVisitor(docId, minutes) {
    const expiresAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();

    const { error } = await supabase
        .from(VISITOR_TABLE)
        .update({
            status: 'Approved',
            access_time: minutes,
            expires_at: expiresAt
        })
        .eq('id', docId);

    if (error) throw error;
}

export async function rejectVisitor(docId) {
    const { error } = await supabase
        .from(VISITOR_TABLE)
        .update({ status: 'Rejected', expires_at: null })
        .eq('id', docId);

    if (error) throw error;
}

export async function deleteVisitor(docId) {
    const { error } = await supabase
        .from(VISITOR_TABLE)
        .delete()
        .eq('id', docId);

    if (error) throw error;
}

export async function expireVisitor(id) {
    const { error } = await supabase
        .from(VISITOR_TABLE)
        .update({ status: 'Expired' })
        .eq('public_id', id);

    if (error) throw error;
}

export async function checkExpiredVisitors() {
    const { error } = await supabase.rpc('expire_due_visitors');
    if (error) throw error;
}

// =======================================
// Property hold requests
// =======================================

export async function addPropertyRequest(request) {
    const payload = {
        visitor_public_id: request.visitorId || '',
        visitor_name: request.visitorName || '',
        phone: request.phone || '',
        email: request.email || '',
        city: request.city || '',
        property_id: request.propertyId || '',
        property_name: request.property || '',
        floor: request.floor || '',
        unit: request.unit || '',
        status: request.status || 'Pending',
        requested_at: request.requestedAt
            ? new Date(request.requestedAt).toISOString()
            : new Date().toISOString()
    };

    const { error } = await supabase
        .from(REQUEST_TABLE)
        .insert(payload);

    if (error) throw error;
}

export async function getPropertyRequests() {
    const { data, error } = await supabase
        .from(REQUEST_TABLE)
        .select('*')
        .order('requested_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(row => ({
        docId: row.id,
        visitorId: row.visitor_public_id,
        visitorName: row.visitor_name,
        phone: row.phone,
        email: row.email,
        city: row.city,
        propertyId: row.property_id,
        property: row.property_name,
        floor: row.floor,
        unit: row.unit,
        status: row.status,
        requestedAt: new Date(row.requested_at).getTime()
    }));
}

export async function deletePropertyRequest(docId) {
    const { error } = await supabase
        .from(REQUEST_TABLE)
        .delete()
        .eq('id', docId);

    if (error) throw error;
}
