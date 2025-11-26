import { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

export function CalendarWidget() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Obtenir le premier jour de la semaine du mois (lundi = 0)
  const firstDayOfWeek = (monthStart.getDay() + 6) % 7;
  
  // Ajouter des jours vides au début pour aligner le calendrier
  const emptyDays = Array(firstDayOfWeek).fill(null);

  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Calendrier</CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7">
                <Settings className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Connexion calendrier</DialogTitle>
                <DialogDescription>
                  Connectez votre calendrier externe pour synchroniser vos événements
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Calendriers disponibles</h4>
                  
                  <Button variant="outline" className="w-full justify-start" disabled>
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    Google Calendar
                    <Badge variant="secondary" className="ml-auto">Bientôt</Badge>
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start" disabled>
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    Outlook
                    <Badge variant="secondary" className="ml-auto">Bientôt</Badge>
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start" disabled>
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    iCloud
                    <Badge variant="secondary" className="ml-auto">Bientôt</Badge>
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground">
                  <p>Les intégrations calendrier seront bientôt disponibles. Vous pourrez :</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Synchroniser vos événements</li>
                    <li>Créer des événements depuis le dashboard</li>
                    <li>Recevoir des rappels</li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handlePrevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-sm font-semibold capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: fr })}
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1">
        {/* Jours de la semaine */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
            <div key={i} className="text-center text-xs font-semibold text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Grille du calendrier */}
        <div className="grid grid-cols-7 gap-1">
          {emptyDays.map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          
          {daysInMonth.map((day) => {
            const isToday = isSameDay(day, today);
            const isCurrentMonth = isSameMonth(day, currentDate);
            
            return (
              <button
                key={day.toISOString()}
                className={`
                  aspect-square rounded-lg text-xs font-medium transition-colors
                  ${isToday ? 'bg-primary text-primary-foreground' : ''}
                  ${!isToday && isCurrentMonth ? 'hover:bg-accent' : ''}
                  ${!isCurrentMonth ? 'text-muted-foreground/50' : ''}
                `}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>

        <div className="mt-4 text-xs text-muted-foreground text-center">
          Aucun événement aujourd'hui
        </div>
      </CardContent>
    </Card>
  );
}
