import React, { useState } from "react";
import { Loader2, Pencil, Trash2, User } from "lucide-react";
import { Image } from "@/components/ui/image";
import { deleteTeamMember } from "@/lib/team";
import { useToast } from "@/components/ui/use-toast";

// Card de um integrante da equipe: foto quadrada com cantos arredondados +
// nome/cargo/texto curto. Os controles de editar/remover só aparecem para
// quem é administrador (a policy de UPDATE/DELETE no Supabase também exige
// isso — ver supabase/schema.sql).
export default function TeamMemberCard({ member, isAdmin = false, onEdit, onDeleted }) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (deleting) return;
    const ok = window.confirm(`Remover "${member.name}" da equipe?`);
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteTeamMember(member);
      toast({ title: "Removido da equipe" });
      onDeleted?.(member.id);
    } catch (err) {
      toast({ title: "Não foi possível remover", variant: "destructive" });
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
      <div className="relative">
        <div className="w-32 h-32 rounded-2xl overflow-hidden bg-zinc-800 border border-zinc-700">
          {member.photo_url ? (
            <Image src={member.photo_url} alt={member.name} fittingType="cover" className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-600">
              <User size={40} />
            </div>
          )}
        </div>
        {isAdmin && (
          <div className="absolute -top-2 -right-2 flex items-center gap-1">
            <button
              onClick={() => onEdit?.(member)}
              aria-label="Editar integrante"
              className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 flex items-center justify-center transition-colors"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              aria-label="Remover integrante"
              className="w-7 h-7 rounded-full bg-red-950/80 hover:bg-red-950 border border-red-900/60 text-red-400 flex items-center justify-center transition-colors disabled:opacity-60"
            >
              {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            </button>
          </div>
        )}
      </div>
      <h3 className="font-bold text-white mt-4">{member.name}</h3>
      {member.role && (
        <p className="text-xs text-red-500 uppercase tracking-widest mt-0.5">{member.role}</p>
      )}
      {member.bio && <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{member.bio}</p>}
    </div>
  );
}
