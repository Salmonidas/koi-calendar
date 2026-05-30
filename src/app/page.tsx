'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CaretRight, CheckCircle, CalendarPlus, Spinner, ShareNetwork, Check } from '@phosphor-icons/react';

export default function Home() {
  const router = useRouter();
  const isCloud = process.env.NEXT_PUBLIC_RUNTIME_MODE === 'cloud' || 
                  (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app'));


  useEffect(() => {
    if (!isCloud) {
      router.replace('/admin');
    }
  }, [isCloud, router]);

  const [teams, setTeams] = useState<any[]>(() => [
    { id: '126536', name: 'Movistar KOI (LEC)', game: 'League of Legends', acronym: 'LEC' },
    { id: '126537', name: 'Movistar KOI (LVP)', game: 'League of Legends', acronym: 'LVP' },
    { id: '128000', name: 'KOI CS2', game: 'Counter-Strike 2', acronym: 'CS2' },
    { id: '129000', name: 'KOI Rocket League', game: 'Rocket League', acronym: 'RL' }
  ]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lang, setLang] = useState<'es' | 'en'>('es');
  const [loading, setLoading] = useState(false);
  const [calendarLink, setCalendarLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isCloud) return; // Bypassed dynamically in local mode
    const fetchTeams = async () => {
      try {
        const res = await fetch('/api/teams');
        const data = await res.json();
        if (data.success && data.teams && data.teams.length > 0) {
          // Normalize the id to string to match the selection Set
          const normalized = data.teams.map((t: any) => ({
            ...t,
            id: t.id.toString()
          }));
          setTeams(normalized);
        }
      } catch (e) {
        console.warn('[Home Page] Failed to fetch dynamic teams:', e);
      }
    };
    fetchTeams();
  }, []);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selected);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelected(newSet);
  };

  const generateCalendar = async () => {
    if (selected.size === 0) return;
    setLoading(true);
    setCalendarLink(null);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/calendar/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamIds: Array.from(selected), lang, colorId: '3' })
      });
      const data = await res.json();
      if (data.success && data.link) {
        setCalendarLink(data.link);
      } else if (data.error) {
        setErrorMsg(data.error);
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Unknown error occurred.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!calendarLink) return;
    navigator.clipboard.writeText(calendarLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isCloud) {
    return (
      <main className="w-full min-h-[100dvh] flex flex-col items-center justify-center p-6 gap-4 font-sans bg-slate-950">
        <Spinner className="animate-spin text-[#00FF85]" size={36} />
        <span className="text-xs font-mono text-white/40">Redirigiendo al Panel Maestro...</span>
      </main>
    );
  }

  return (
    <main className="w-full min-h-[100dvh] flex flex-col items-center px-4 py-24 md:py-40 font-sans">
      
      {/* Header section with macro-whitespace */}
      <motion.div 
        initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
        className="max-w-4xl w-full flex flex-col items-center text-center space-y-6 mb-24"
      >
        <div className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium bg-white/5 ring-1 ring-white/10 text-white/70">
          {lang === 'es' ? 'Ecosistema KOI' : 'KOI Ecosystem'}
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white/90">
          {lang === 'es' ? 'Calendarios de ' : 'KOI '}<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7000FF] to-[#00FF85]">{lang === 'es' ? 'KOI.' : 'Calendars.'}</span>
        </h1>
        <p className="text-white/50 max-w-lg text-lg">
          {lang === 'es' ? 'Selecciona tus rosters favoritos y genera un calendario de Google unificado de actualización automática.' : 'Select your favorite rosters and generate a unified, dynamically updating Google Calendar.'}
        </p>
        
        {/* Language Toggle */}
        <div className="flex bg-white/5 ring-1 ring-white/10 rounded-full p-1 mt-6">
          <button 
            onClick={() => setLang('es')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${lang === 'es' ? 'bg-[#7000FF] text-white shadow-lg' : 'text-white/50 hover:text-white/80'}`}
          >
            Español
          </button>
          <button 
            onClick={() => setLang('en')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${lang === 'en' ? 'bg-[#7000FF] text-white shadow-lg' : 'text-white/50 hover:text-white/80'}`}
          >
            English
          </button>
        </div>
      </motion.div>

      {/* Asymmetrical Bento Grid */}
      <motion.div 
        className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-6"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.2, ease: [0.32, 0.72, 0, 1] }}
      >
        {teams.map((team, idx) => {
          const isSelected = selected.has(team.id);
          // Bento grid span assignment logic
          const colSpan = idx % 3 === 0 ? 'md:col-span-8' : 'md:col-span-4';
          
          return (
            <div key={team.id} className={`${colSpan} double-bezel cursor-pointer group`} onClick={() => toggleSelection(team.id)}>
              <div className="double-bezel-inner relative h-48 md:h-64 p-8 flex flex-col justify-end transition-all duration-700 group-hover:bg-white/[0.08]">
                {/* Checkmark overlay */}
                <div className={`absolute top-6 right-6 transition-all duration-500 ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                   <CheckCircle size={32} weight="fill" className="text-[#00FF85]" />
                 </div>
 
                 <p className="text-xs font-mono uppercase tracking-widest text-white/40 mb-2">{team.game}</p>
                 <h3 className={`text-2xl font-medium transition-colors duration-500 ${isSelected ? 'text-white' : 'text-white/70'}`}>
                   {team.name}
                 </h3>
               </div>
             </div>
          );
        })}
      </motion.div>

      {/* Floating Action Island (Fluid Nav pattern) */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 double-bezel flex items-center p-2 pr-2 pl-6 gap-6"
          >
            <div className="double-bezel-inner absolute inset-0 -z-10" />
            
            <div className="flex flex-col">
              <span className="text-white font-medium">{selected.size} {lang === 'es' ? 'rosters seleccionados' : 'rosters selected'}</span>
              <span className="text-white/50 text-xs">{lang === 'es' ? 'Listo para sincronizar' : 'Ready to sync'}</span>
            </div>

            {/* Button-in-Button CTA */}
            <button 
              onClick={generateCalendar}
              disabled={loading}
              className="group flex items-center gap-4 bg-white text-black px-6 py-3 rounded-full font-medium active:scale-[0.98] transition-transform duration-500"
            >
              {loading ? (lang === 'es' ? 'Generando...' : 'Generating...') : (lang === 'es' ? 'Crear Calendario' : 'Create Calendar')}
              <div className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center transition-all duration-500 group-hover:translate-x-1 group-hover:-translate-y-[1px] group-hover:scale-105">
                {loading ? <Spinner className="animate-spin" /> : <CaretRight weight="bold" />}
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result Modal */}
      <AnimatePresence>
        {calendarLink && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] backdrop-blur-3xl bg-black/80 flex items-center justify-center p-4"
            onClick={() => setCalendarLink(null)}
          >
            <motion.div 
              initial={{ y: 50, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              onClick={e => e.stopPropagation()}
              className="max-w-md w-full double-bezel"
            >
              <div className="double-bezel-inner p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-[#00FF85]/20 flex items-center justify-center text-[#00FF85] mb-6">
                  <CalendarPlus size={32} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{lang === 'es' ? 'Calendario Listo' : 'Calendar Ready'}</h3>
                <p className="text-white/60 mb-8 text-sm">{lang === 'es' ? 'Tu calendario unificado de KOI ha sido creado. Haz clic abajo para añadirlo o cópialo para compartirlo.' : 'Your unified KOI calendar has been created. Click below to add it or copy to share.'}</p>
                
                <div className="w-full flex flex-col sm:flex-row gap-3">
                  <a 
                    href={calendarLink}
                    target="_blank" rel="noreferrer"
                    className="flex-1 text-center py-4 rounded-full bg-white text-black font-semibold hover:bg-white/90 transition-colors text-sm"
                  >
                    {lang === 'es' ? 'Añadir a Google' : 'Add to Google'}
                  </a>
                  <button 
                    onClick={copyToClipboard}
                    className="flex-1 flex items-center justify-center gap-2 py-4 rounded-full bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors border border-white/10 text-sm active:scale-[0.98] transition-transform duration-300"
                  >
                    {copied ? <Check size={18} className="text-[#00FF85]" /> : <ShareNetwork size={18} />}
                    {copied ? (lang === 'es' ? '¡Copiado!' : 'Copied!') : (lang === 'es' ? 'Compartir' : 'Share')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Modal */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] backdrop-blur-3xl bg-black/80 flex items-center justify-center p-4"
            onClick={() => setErrorMsg(null)}
          >
            <motion.div 
              initial={{ y: 50, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              onClick={e => e.stopPropagation()}
              className="max-w-md w-full double-bezel"
            >
              <div className="double-bezel-inner p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 mb-6">
                  <span className="text-2xl font-bold">!</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{lang === 'es' ? 'Error' : 'Error'}</h3>
                <p className="text-white/60 mb-8">{errorMsg}</p>
                <button 
                  onClick={() => setErrorMsg(null)}
                  className="w-full text-center py-4 rounded-full bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors ring-1 ring-white/10"
                >
                  {lang === 'es' ? 'Cerrar' : 'Close'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer / Credits */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="mt-32 mb-8 flex flex-col sm:flex-row items-center justify-center gap-2 text-xs font-mono text-white/30"
      >
        <span>
          {lang === 'es' ? 'Desarrollada por' : 'Developed by'}
        </span>
        <a 
          href="https://salmonidas-dev.vercel.app/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.1] hover:text-white transition-all group active:scale-[0.98] duration-300"
        >
          <img 
            src="https://salmonidas-dev.vercel.app/logo.webp" 
            alt="Salmónidas Logo" 
            className="w-4 h-4 rounded-full object-cover transition-transform duration-500 group-hover:rotate-[360deg]" 
            onError={(e) => {
              e.currentTarget.src = "https://salmonidas-dev.vercel.app/icon.png";
            }}
          />
          <span className="font-semibold text-white/60 group-hover:text-white transition-colors">Salmónidas</span>
        </a>
      </motion.footer>

    </main>
  );
}
