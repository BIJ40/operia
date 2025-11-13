import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ColorPreset } from '@/types/block';
import { toast } from 'sonner';

export interface HomeCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  color_preset: ColorPreset;
  link: string;
  display_order: number;
}

const defaultCards: Omit<HomeCard, 'id'>[] = [
  {
    title: "GUIDE d'utilisation Apogée",
    description: "Consultez le guide complet d'utilisation du CRM Apogée",
    icon: 'BookOpen',
    color_preset: 'blue',
    link: '/guide-apogee',
    display_order: 0
  },
  {
    title: "Guide des apporteurs nationaux",
    description: "Informations sur les apporteurs nationaux",
    icon: 'Users',
    color_preset: 'green',
    link: '/apporteurs-nationaux',
    display_order: 1
  },
  {
    title: "Informations utiles",
    description: "Ressources et informations complémentaires",
    icon: 'Info',
    color_preset: 'orange',
    link: '/informations-utiles',
    display_order: 2
  }
];

export function useHomeCards() {
  const [cards, setCards] = useState<HomeCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      // Charger depuis Supabase
      const { data: supabaseCards, error } = await supabase
        .from('home_cards')
        .select('*')
        .order('display_order');

      if (error) throw error;

      // Si pas de données dans Supabase, migrer depuis localStorage
      if (!supabaseCards || supabaseCards.length === 0) {
        const localData = localStorage.getItem('homeCards');
        if (localData) {
          const localCards = JSON.parse(localData);
          // Migrer vers Supabase
          for (let i = 0; i < localCards.length; i++) {
            const card = localCards[i];
            await supabase.from('home_cards').insert({
              title: card.title,
              description: card.description,
              icon: card.icon,
              color_preset: card.colorPreset || card.color_preset,
              link: card.link,
              display_order: i
            });
          }
          // Recharger
          const { data: newData } = await supabase
            .from('home_cards')
            .select('*')
            .order('display_order');
          setCards((newData || []) as HomeCard[]);
        } else {
          // Insérer les cartes par défaut
          for (const card of defaultCards) {
            await supabase.from('home_cards').insert(card);
          }
          const { data: newData } = await supabase
            .from('home_cards')
            .select('*')
            .order('display_order');
          setCards((newData || []) as HomeCard[]);
        }
      } else {
        setCards(supabaseCards as HomeCard[]);
      }
    } catch (error) {
      console.error('Erreur chargement cartes:', error);
      toast.error('Erreur lors du chargement des cartes');
    } finally {
      setLoading(false);
    }
  };

  const updateCard = async (id: string, updates: Partial<HomeCard>) => {
    try {
      const { error } = await supabase
        .from('home_cards')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setCards(cards.map(card => card.id === id ? { ...card, ...updates } : card));
      toast.success('Carte mise à jour');
    } catch (error) {
      console.error('Erreur mise à jour carte:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  return { cards, loading, updateCard, refreshCards: loadCards };
}
