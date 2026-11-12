import { NextResponse } from "next/server";
import { categories } from "@/lib/catalog";
import { handle } from "@/lib/http";

/** The shelf's tabs, with how many products each has on sale. */
export const GET = () => handle(async () => NextResponse.json(await categories()));
