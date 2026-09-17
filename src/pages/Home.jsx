import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Car, Bike, Phone, MapPin, Mail, Instagram, Facebook, ChevronRight, LogIn, Plus } from "lucide-react";
import { listVehicles } from "@/lib/vehicles";
import { listTeamMembers } from "@/lib/team";
import { listApprovedReviews } from "@/lib/reviews";
import { listPartnerListings } from "@/lib/partnerListings";
import { isAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";
import Logo from "@/components/Logo";
import VehicleCard from "@/components/VehicleCard";
import VehicleForm from "@/components/VehicleForm";
import UserBadge from "@/components/UserBadge";
import TeamMemberCard from "@/components/TeamMemberCard";
import TeamMemberForm from "@/components/TeamMemberForm";
import ReviewCard from "@/components/ReviewCard";
import ReviewForm from "@/components/ReviewForm";
import PendingReviews from "@/components/PendingReviews";
import PartnerListingCard from "@/components/PartnerListingCard";
import PartnerListingFormModal from "@/components/PartnerListingFormModal";

const WHATSAPP_NUMBER = "5541991369093";

export default function Home() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todos");
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamFormOpen, setTeamFormOpen] = useState(null); // null | "new" | membro sendo editado
  const [reviews, setReviews] = useState([]);
  const [partnerListings, setPartnerListings] = useState([]);
  const [partnerFormOpen, setPartnerFormOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listVehicles({ limit: 100 });
      setVehicles(data);
    } catch (e) {
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTeam = useCallback(async () => {
    try {
      const data = await listTeamMembers();
      setTeamMembers(data);
    } catch (e) {
      setTeamMembers([]);
    }
  }, []);

  const loadReviews = useCallback(async () => {
    try {
      const data = await listApprovedReviews();
      setReviews(data);
    } catch (e) {
      setReviews([]);
    }
  }, []);

  const loadPartners = useCallback(async () => {
    try {
      const data = await listPartnerListings();
      setPartnerListings(data);
    } catch (e) {
      setPartnerListings([]);
    }
  }, []);

  useEffect(() => {
    load();
    loadTeam();
    loadReviews();
    loadPartners();
  }, [load, loadTeam, loadReviews, loadPartners]);

  // Só quem é administrador vê o botão de excluir anúncio nos cards (a
  // policy de DELETE no Supabase também exige isso — supabase/schema.sql).
  useEffect(() => {
    let active = true;
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      setIsLoggedIn(!!data.user);
      setIsAdminUser(data.user ? await isAdmin() : false);
    };
    check();
    const { data: subscription } = supabase.auth.onAuthStateChange(() => check());
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const filtered = filter === "todos" ? vehicles : vehicles.filter((v) => v.vehicle_type === filter);

  return (
    <div
      className={`min-h-screen ${isAdminUser ? "text-zinc-900" : "text-white"}`}
      style={
        isAdminUser
          ? { backgroundColor: "#ffffff", backgroundAttachment: "fixed" }
          : {
              backgroundColor: "#000000",
              backgroundImage: "radial-gradient(circle at 15% 10%, rgba(239,68,68,0.06), transparent 45%)",
              backgroundAttachment: "fixed",
            }
      }
    >
      {/* NAVBAR */}
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-zinc-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Logo className="h-12 w-12" />
            <div className="leading-none">
              <span className="block font-bold tracking-wider text-white">FIVE GARAGE</span>
              <span className="block text-[10px] text-red-500 tracking-[0.2em] uppercase">Carros & Motos</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-zinc-300">
            <a href="#vitrine" className="hover:text-white transition-colors">Anúncios</a>
            <a href="#anunciar" className="hover:text-white transition-colors">Anunciar</a>
            <a href="#sobre" className="hover:text-white transition-colors">Sobre</a>
            <a href="#parceiros" className="hover:text-white transition-colors">Parceiros</a>
            <a href="#equipe" className="hover:text-white transition-colors">Equipe</a>
            <a href="#avaliacoes" className="hover:text-white transition-colors">Avaliações</a>
            <a href="#contato" className="hover:text-white transition-colors">Contato</a>
          </nav>
          <div className="flex items-center gap-3">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              <Phone size={16} /> <span className="hidden sm:inline">Fale conosco</span>
            </a>
            {!isLoggedIn && (
              <Link
                to="/login"
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                <LogIn size={16} /> <span className="hidden sm:inline">Entrar</span>
              </Link>
            )}
            <UserBadge />
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-black via-zinc-950 to-black text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, #ef4444 0, transparent 40%), radial-gradient(circle at 80% 70%, #3f3f46 0, transparent 50%)" }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-28 grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <span className="inline-block px-3 py-1 rounded-full bg-red-600/20 border border-red-600/40 text-red-400 text-xs font-semibold uppercase tracking-widest">
              Compra • Venda
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
              <span className="text-white">FIVE</span>{" "}
              <span className="text-zinc-500">GARAGE</span>
              <span className="block text-2xl md:text-3xl font-light text-zinc-400 mt-2">Carros & Motos</span>
            </h1>
            <p className="text-lg text-zinc-400 max-w-md">
              O melhor da compra e venda de veículos. Anuncie o seu, encontre o seu próximo carro ou moto e feche negócio direto pelo WhatsApp.
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="#vitrine" className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-6 py-3 rounded-xl font-bold transition-colors">
                Ver anúncios <ChevronRight size={18} />
              </a>
              <a href="#anunciar" className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-6 py-3 rounded-xl font-bold transition-colors border border-zinc-700">
                Anunciar meu veículo
              </a>
            </div>
            <div className="flex gap-8 pt-4">
              <div>
                <div className="text-2xl font-bold text-white">{vehicles.length}</div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider">Anúncios ativos</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">100%</div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider">Negócio direto</div>
              </div>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="relative w-full max-w-md">
              <div className="absolute -inset-6 bg-red-600/20 blur-3xl rounded-full" />
              <Logo
                variant="lockup"
                className="relative w-full h-auto rounded-2xl shadow-2xl shadow-black/60 border border-zinc-800"
              />
            </div>
          </div>
        </div>
      </section>

      {/* VITRINE */}
      <section id="vitrine" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-red-500 text-sm font-semibold uppercase tracking-widest">Vitrine</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-1">Anúncios disponíveis</h2>
          </div>
          <div className="flex gap-2">
            {[
              { k: "todos", label: "Todos" },
              { k: "carro", label: "Carros", icon: Car },
              { k: "moto", label: "Motos", icon: Bike },
            ].map((f) => (
              <button
                key={f.k}
                onClick={() => setFilter(f.k)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filter === f.k ? "bg-red-600 text-white" : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white"}`}
              >
                {f.icon && <f.icon size={15} />} {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-72 rounded-2xl bg-zinc-900 border border-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            <Car size={48} className="mx-auto mb-4 opacity-40" />
            <p className="text-lg">Nenhum anúncio encontrado ainda.</p>
            <p className="text-sm">Seja o primeiro a anunciar!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((v) => (
              <VehicleCard key={v.id} vehicle={v} isAdmin={isAdminUser} onDeleted={load} onUpdated={load} />
            ))}
          </div>
        )}
      </section>

      {/* ANUNCIAR */}
      <section id="anunciar" className="bg-zinc-950 border-y border-zinc-800 py-16 md:py-20 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <span className="text-red-500 text-sm font-semibold uppercase tracking-widest">Anuncie</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-1 mb-4">Quer vender seu veículo?</h2>
          <p className="text-zinc-400 mb-8 max-w-xl mx-auto">
            Publique seu anúncio na Five Garage. Compradores interessados entram em contato direto pelo WhatsApp.
          </p>
          <VehicleForm onCreated={load} />
        </div>
      </section>

      {/* SOBRE */}
      <section id="sobre" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-20">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { t: "Compra e venda", d: "Compramos seu veículo no melhor preço ou ajudamos a vender com segurança." },
            { t: "Negócio direto", d: "Fale direto com a gente pelo WhatsApp, sem intermediários." },
            { t: "Carros e motos", d: "Trabalhamos com todos os tipos de veículos, novos e usados." },
          ].map((f, i) => (
            <div key={i} className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-red-600/40 transition-colors text-white">
              <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center mb-4">
                <span className="text-red-500 font-bold">{i + 1}</span>
              </div>
              <h3 className="font-bold text-lg mb-2">{f.t}</h3>
              <p className="text-zinc-400 text-sm">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ANÚNCIOS PARCEIROS */}
      <section id="parceiros" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 text-center md:text-left">
          <div>
            <span className="text-red-500 text-sm font-semibold uppercase tracking-widest">Quem indicamos</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-1">Anúncios parceiros</h2>
          </div>
          {isAdminUser && (
            <button
              onClick={() => setPartnerFormOpen(true)}
              className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors self-center md:self-auto"
            >
              <Plus size={16} /> Adicionar parceiro
            </button>
          )}
        </div>

        {partnerListings.length === 0 ? (
          <p className="text-center text-zinc-500">Em breve, conheça nossos parceiros.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {partnerListings.map((p) => (
              <PartnerListingCard
                key={p.id}
                listing={p}
                isAdmin={isAdminUser}
                onDeleted={() => setPartnerListings((list) => list.filter((x) => x.id !== p.id))}
                onUpdated={loadPartners}
              />
            ))}
          </div>
        )}
      </section>

      {/* EQUIPE */}
      <section id="equipe" className="bg-zinc-950 border-y border-zinc-800 py-16 md:py-20 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 text-center md:text-left">
            <div>
              <span className="text-red-500 text-sm font-semibold uppercase tracking-widest">Quem faz a Five Garage</span>
              <h2 className="text-3xl md:text-4xl font-bold mt-1">Nossa equipe</h2>
            </div>
            {isAdminUser && (
              <button
                onClick={() => setTeamFormOpen("new")}
                className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors self-center md:self-auto"
              >
                <Plus size={16} /> Adicionar integrante
              </button>
            )}
          </div>

          {teamMembers.length === 0 ? (
            <p className="text-center text-zinc-500">Em breve, conheça quem cuida do seu atendimento na Five Garage.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {teamMembers.map((m) => (
                <TeamMemberCard
                  key={m.id}
                  member={m}
                  isAdmin={isAdminUser}
                  onEdit={setTeamFormOpen}
                  onDeleted={() => setTeamMembers((list) => list.filter((x) => x.id !== m.id))}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* AVALIAÇÕES */}
      <section id="avaliacoes" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-20">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-red-500 text-sm font-semibold uppercase tracking-widest">Avaliações</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-1 mb-3">O que dizem nossos clientes</h2>
          <p className="text-zinc-400">Já fez negócio com a gente? Deixe sua avaliação e ajude outras pessoas a decidir.</p>
        </div>

        {isAdminUser && <PendingReviews />}

        <div className="grid md:grid-cols-2 gap-8 items-start">
          <ReviewForm />
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <p className="text-zinc-500 text-center md:text-left">Ainda não há avaliações publicadas. Seja o primeiro a avaliar!</p>
            ) : (
              reviews.map((r) => (
                <ReviewCard
                  key={r.id}
                  review={r}
                  isAdmin={isAdminUser}
                  onDeleted={(id) => setReviews((list) => list.filter((x) => x.id !== id))}
                />
              ))
            )}
          </div>
        </div>
      </section>

      {teamFormOpen && (
        <TeamMemberForm
          editing={teamFormOpen === "new" ? null : teamFormOpen}
          onClose={() => setTeamFormOpen(null)}
          onSaved={loadTeam}
        />
      )}

      <PartnerListingFormModal
        listing={null}
        open={partnerFormOpen}
        onOpenChange={setPartnerFormOpen}
        onSaved={loadPartners}
      />

      {/* CONTATO / FOOTER */}
      <footer id="contato" className="bg-zinc-950 border-t border-zinc-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Logo className="h-14 w-14" />
              <div>
                <div className="font-bold tracking-wider">FIVE GARAGE</div>
                <div className="text-xs text-red-500 uppercase tracking-widest">Carros & Motos</div>
              </div>
            </div>
            <p className="text-sm text-zinc-400">Compra e venda de carros e motos. Anuncie, curta e feche negócio direto pelo WhatsApp.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-zinc-200">Contato</h4>
            <ul className="space-y-3 text-sm text-zinc-400">
              <li>
                <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white">
                  <Phone size={15} className="text-red-500" /> (41) 99136-9093
                </a>
              </li>
              <li className="flex items-center gap-2"><Mail size={15} className="text-red-500" /> contato@fivegarage.com.br</li>
              <li className="flex items-center gap-2"><MapPin size={15} className="text-red-500" /> Curitiba, PR</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-zinc-200">Redes sociais</h4>
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-red-600 flex items-center justify-center transition-colors"><Instagram size={18} /></a>
              <a href="#" className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-red-600 flex items-center justify-center transition-colors"><Facebook size={18} /></a>
              <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-[#25D366] flex items-center justify-center transition-colors"><Phone size={18} /></a>
            </div>
          </div>
        </div>
        <div className="border-t border-zinc-800 py-5 text-center text-xs text-zinc-600">
          © {new Date().getFullYear()} Five Garage — Carros & Motos. Compra • Venda.
          {" · "}
          <Link to="/login" className="hover:text-zinc-400">
            Área administrativa
          </Link>
        </div>
      </footer>
    </div>
  );
}
