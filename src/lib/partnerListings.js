// @ts-nocheck
import { supabase } from "@/lib/supabaseClient";
import { listPartnerListingPhotos, deleteAllPartnerListingPhotoFiles } from "@/lib/partnerListingPhotos";

const TABLE = "partner_listings";

export async function listPartnerListings() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// Só administradores conseguem criar/editar/remover (a policy no Supabase
// também exige isso — ver supabase/schema.sql).
export async function createPartnerListing(payload) {
  const { data, error } = await supabase.from(TABLE).insert([payload]).select().single();
  if (error) throw error;
  return data;
}

export async function updatePartnerListing(id, patch) {
  const { data, error } = await supabase.from(TABLE).update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

// Mesmo cuidado do deleteVehicle: busca as fotos antes de apagar o
// registro (as linhas em partner_listing_photos somem sozinhas via "on
// delete cascade", mas os arquivos no Storage não).
export async function deletePartnerListing(listing) {
  const id = typeof listing === "string" ? listing : listing.id;

  let photos = [];
  try {
    photos = await listPartnerListingPhotos(id);
  } catch {
    photos = [];
  }

  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;

  if (photos.length) {
    deleteAllPartnerListingPhotoFiles(photos);
  }
}
