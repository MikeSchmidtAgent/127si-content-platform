import { NextResponse } from "next/server";
import { authenticateContentAdmin } from "@/lib/admin-auth";
const MAX_FILE_SIZE = 500 * 1024 * 1024;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) { const auth = await authenticateContentAdmin(request); if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status }); const client = auth.adminClient; const { id } = await params; const body = await request.json(); if (!body.filename || !body.size || body.size > MAX_FILE_SIZE) return NextResponse.json({ error: "Files must be 500 MB or smaller" }, { status: 400 }); const ext = String(body.filename).split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin"; const path = `${id}/${crypto.randomUUID()}.${ext}`; const { data, error } = await client.storage.from("content-media").createSignedUploadUrl(path); if (error) return NextResponse.json({ error: error.message }, { status: 500 }); return NextResponse.json({ path, token: data.token }); }

