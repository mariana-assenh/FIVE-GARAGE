import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Car, Bike, Phone, MapPin, Mail, Instagram, Facebook, ChevronRight } from "lucide-react";
import { listVehicles } from "@/lib/vehicles";
import { isAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";
import Logo from "@/components/Logo";
import VehicleCard from "@/components/VehicleCard";
import VehicleForm from "@/components/VehicleForm";

const WHATSAPP_NUMBER = "5541991369093";

export default function Home() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todos");
  const [isAdminUser, setIsAdminUser] = useState(false);

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

  useEffect(() => {
    load();
  }, [load]);

  // Só quem é administrador vê o botão de excluir anúncio nos cards (a
  // policy de DELETE no Supabase também exige isso — supabase/schema.sql).
  useEffect(() => {
    let active = true;
    const check = () => isAdmin().then((ok) => active && setIsAdminUser(ok));
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
            <a href="#contato" className="hover:text-white transition-colors">Contato</a>
          </nav>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <Phone size={16} /> <span className="hidden sm:inline">Fale conosco</span>
          </a>
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
              <VehicleCard key={v.id} vehicle={v} isAdmin={isAdminUser} onDeleted={load} />
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
            Publique seu anúncio gratuitamente. Compradores interessados entram em contato direto pelo WhatsApp.
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
