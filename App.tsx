import { useState, useEffect } from 'react';
import { Instagram, Phone, Sparkles, Calendar } from 'lucide-react';
import { ImageWithFallback } from './components/figma/ImageWithFallback.tsx';
import { ManageAppointments } from './components/ManageAppointments.tsx';
import logoImage from "./components/figma/LogoImage.jpeg";
import { createAppointment, updateAppointment, getAppointments } from './src/app';

interface Service {
  id: string;
  name: string;
  duration: string;
  price: number;
  isPackage?: boolean;
}

interface Appointment {
  id: string;
  service: Service;
  date: string;
  time: string;
  professional: string;
  firstName: string;
  lastName: string;
  phone: string;
  packageOption?: string;
}

const services: Service[] = [
  { id: '1', name: 'Mão (esmaltação)', duration: '30 minutos', price: 10 },
  { id: '2', name: 'Pé (esmaltação)', duration: '30 minutos', price: 10 },
  { id: '3', name: 'Pé e mão (esmaltação)', duration: '1 hora', price: 20 },
  { id: '4', name: 'Mão (Cutilagem e esmaltação)', duration: '1 hora', price: 30 },
  { id: '5', name: 'Pé (Cutilagem e esmaltação)', duration: '1 hora', price: 30 },
  { id: '6', name: 'Pé e mão (Cutilagem e esmaltação)', duration: '2 horas', price: 50 },
  { id: '7', name: 'Pacote mensal', duration: '4 Manicures + 2 Pedicures', price: 130, isPackage: true },
];

const availableDates = [
  '12/12/2025',
  '13/12/2025',
  '14/12/2025',
  '15/12/2025',
  '16/12/2025',
  '17/12/2025',
  '18/12/2025',
  '19/12/2025',
  '20/12/2025',
  '21/12/2025',
  '22/12/2025',
  '23/12/2025',
  '24/12/2025',
  '26/12/2025',
  '27/12/2025',
];

const professionals = [
  { id: '1', name: 'Gaby' }
];

// Generate available times: 30-min intervals from 8:00 to 17:00
function generateAvailableTimes(): string[] {
  const times: string[] = [];
  for (let hour = 8; hour < 17; hour++) {
    times.push(`${String(hour).padStart(2, '0')}:00`);
    if (hour < 17) {
      times.push(`${String(hour).padStart(2, '0')}:30`);
    }
  }
  return times;
}

const availableTimes = generateAvailableTimes();

// Helper: parse date string DD/MM/YYYY to Date object
function parseDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split('/').map(Number);
  return new Date(year, month - 1, day);
}

// Helper: format Date to DD/MM/YYYY
function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Helper: calculate automatic dates based on frequency (15 or 20 days)
function generatePackageDates(firstDate: string, frequency: '15' | '20', count: number = 4): string[] {
  const dates: string[] = [firstDate];
  let currentDate = parseDate(firstDate);
  const freqDays = frequency === '15' ? 15 : 20;

  for (let i = 1; i < count; i++) {
    currentDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() + freqDays);
    dates.push(formatDate(currentDate));
  }

  return dates;
}

// Helper: get duration in minutes
function getDurationMinutes(duration: string): number {
  if (duration.includes('30 minutos')) return 30;
  if (duration.includes('1 hora')) return 60;
  if (duration.includes('2 horas')) return 120;
  if (duration.includes('Manicures')) return 60; // Pacote duration - each appointment is 1 hour
  return 30; // default
}

// Helper: get package sequence details (which services for each appointment)
function getPackageSequence(index: number): { label: string; serviceId: string; serviceName: string; duration: string } {
  // Package 1/6: Pé e mão (Cutilagem e esmaltação) - service id 6
  // Package 2/6: Mão (Cutilagem e esmaltação) - service id 4
  // Package 3/6: Pé e mão (Cutilagem e esmaltação) - service id 6
  // Package 4/6: Mão (Cutilagem e esmaltação) - service id 4
  // (repeats, but only 4 are used in the package)

  const sequence = [
    { label: 'Pacote 1/4', serviceId: '6', serviceName: 'Pé e mão (Cutilagem e esmaltação)', duration: '2 horas' },
    { label: 'Pacote 2/4', serviceId: '4', serviceName: 'Mão (Cutilagem e esmaltação)', duration: '1 hora' },
    { label: 'Pacote 3/4', serviceId: '6', serviceName: 'Pé e mão (Cutilagem e esmaltação)', duration: '2 horas' },
    { label: 'Pacote 4/4', serviceId: '4', serviceName: 'Mão (Cutilagem e esmaltação)', duration: '1 hora' },
  ];

  return sequence[index % sequence.length];
}

// Helper: check if time slot is blocked (by booked appointments)
function isTimeSlotAvailable(
  date: string,
  time: string,
  duration: string,
  allAppointments: Appointment[]
): boolean {
  const durationMins = getDurationMinutes(duration);
  const [hours, mins] = time.split(':').map(Number);
  const slotStartMins = hours * 60 + mins;
  const slotEndMins = slotStartMins + durationMins;

  // Check all booked appointments on this date
  for (const apt of allAppointments) {
    if (apt.date === date) {
      const [aptHours, aptMins] = apt.time.split(':').map(Number);
      const aptStartMins = aptHours * 60 + aptMins;
      const aptDurationMins = getDurationMinutes(apt.service.duration);
      const aptEndMins = aptStartMins + aptDurationMins;

      // Check if times overlap (8:00-9:00 blocks 8:00, 8:30 but not 9:00)
      if (slotStartMins < aptEndMins && slotEndMins > aptStartMins) {
        return false;
      }
    }
  }

  return true;
}

// Helper: filter dates to only future dates (from today onwards)
function filterFutureDates(dates: string[]): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return dates.filter(dateStr => {
    const [day, month, year] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    return date >= today;
  }).sort((a, b) => {
    const dateA = parseDate(a);
    const dateB = parseDate(b);
    return dateA.getTime() - dateB.getTime();
  });
}

// Helper: check if a date has any available time slot
function hasAvailableTimeSlot(date: string, service: Service | null, appointments: Appointment[]): boolean {
  if (!service) return false;
  return availableTimes.some(time => isTimeSlotAvailable(date, time, service.duration, appointments));
}

export default function App() {
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [packageOption, setPackageOption] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', phone: '' });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showManageAppointments, setShowManageAppointments] = useState(false);
  const [reschedulingAppointment, setReschedulingAppointment] = useState<Appointment | null>(null);
  const [packageDates, setPackageDates] = useState<string[]>([]); // Auto-generated dates for package
  const [isSelectingNewDate, setIsSelectingNewDate] = useState(false); // For rescheduling: allow re-selection of date

  useEffect(() => {
    async function load() {
      try {
        const data = await getAppointments({ limit: 200, order: 'asc' });
        if (data && data.length) {
          const mapped = data.map((d: any) => ({
            id: d.id,
            service: d.service,
            date: d.date,
            time: d.time,
            professional: d.professional,
            firstName: d.first_name || d.firstName || '',
            lastName: d.last_name || d.lastName || '',
            phone: d.phone || '',
            packageOption: d.package_option || d.packageOption || null,
          }));
          setAppointments(mapped);
        } else {
          const storedAppointments = localStorage.getItem('appointments');
          if (storedAppointments) setAppointments(JSON.parse(storedAppointments));
        }
      } catch (err) {
        console.error('Erro ao carregar agendamentos do Supabase:', err);
        const storedAppointments = localStorage.getItem('appointments');
        if (storedAppointments) setAppointments(JSON.parse(storedAppointments));
      }
    }
    load();
  }, []);

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setPackageOption(null);
    setSelectedDate(null);
    setPackageDates([]);
    setSelectedProfessional(null);
    setSelectedTime(null);
    setShowConfirmation(false);
    setIsSelectingNewDate(false);
  };

  const handlePackageOptionSelect = (option: string) => {
    setPackageOption(option);
    setSelectedDate(null);
    setPackageDates([]);
    setSelectedProfessional(null);
    setSelectedTime(null);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setIsSelectingNewDate(false); // Hide date selection after choosing
    // During rescheduling, keep professional; otherwise reset it
    if (!reschedulingAppointment) {
      setSelectedProfessional(null);
    }
    setSelectedTime(null);

    // If package option selected, auto-generate other dates
    if (selectedService?.isPackage && packageOption) {
      const frequency = packageOption.includes('15') ? '15' : '20';
      const autoDates = generatePackageDates(date, frequency as '15' | '20', 4);
      setPackageDates(autoDates);
      console.log('Auto-generated dates for package:', autoDates);
    } else {
      setPackageDates([]);
    }
  };

  const handleProfessionalSelect = (professionalId: string) => {
    setSelectedProfessional(professionalId);
    setSelectedTime(null);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Para pacotes, profissional é sempre Gaby (não precisa selecionar)
    const needsProfessionalSelection = !selectedService?.isPackage;
    
    if (selectedService && selectedDate && selectedTime && formData.firstName && formData.lastName && formData.phone) {
      if (needsProfessionalSelection && !selectedProfessional) {
        alert('Por favor, selecione uma profissional');
        return;
      }

      if (reschedulingAppointment) {
        // Atualizar agendamento existente (local state)
        const updatedAppointments = appointments.map(apt =>
          apt.id === reschedulingAppointment.id
            ? {
                ...apt,
                service: selectedService,
                date: selectedDate,
                time: selectedTime,
                packageOption: selectedService.isPackage ? packageOption || undefined : undefined,
              }
            : apt
        );
        setAppointments(updatedAppointments);
        localStorage.setItem('appointments', JSON.stringify(updatedAppointments));

        // Atualizar no Supabase
        try {
          await updateAppointment(reschedulingAppointment.id, {
            service: selectedService,
            date: selectedDate,
            time: selectedTime,
            professional: 'Gaby',
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            packageOption: selectedService.isPackage ? packageOption || null : null,
          });
        } catch (err) {
          console.error('Erro ao atualizar no Supabase:', err);
        }

        setReschedulingAppointment(null);
      } else {
        // Criar novo agendamento(s)
        const appointmentsToCreate: Appointment[] = [];

        // If it's a package, create multiple appointments for auto-generated dates
        if (selectedService.isPackage && packageDates.length > 0) {
          // Verificar disponibilidade de todos os horários antes de criar
          let canCreatePackage = true;
          
          for (let idx = 0; idx < packageDates.length; idx++) {
            const date = packageDates[idx];
            const packageSeq = getPackageSequence(idx);
            const duration = packageSeq.duration; // Use the sequence duration (1 hora)
            const isAvailable = isTimeSlotAvailable(date, selectedTime, duration, appointments);
            console.log(`Checking availability for ${date} at ${selectedTime} (${duration}):`, isAvailable);
            if (!isAvailable) {
              canCreatePackage = false;
              alert(`Horário não disponível em ${date}. Por favor, escolha outro horário ou data.`);
              break;
            }
          }

          if (canCreatePackage) {
            packageDates.forEach((date, idx) => {
              const packageSeq = getPackageSequence(idx);
              // Generate unique numeric IDs: timestamp + index (prevents duplicates)
              const uniqueId = (Date.now() * 100 + idx).toString();
              const apt: Appointment = {
                id: uniqueId,
                service: {
                  id: packageSeq.serviceId,
                  name: packageSeq.serviceName,
                  duration: packageSeq.duration,
                  price: 0,
                },
                date: date,
                time: selectedTime,
                professional: 'Gaby',
                firstName: formData.firstName,
                lastName: formData.lastName,
                phone: formData.phone,
                packageOption: packageSeq.label,
              };
              appointmentsToCreate.push(apt);
            });
            console.log('Package appointments created:', appointmentsToCreate);
          } else {
            return;
          }
        } else {
          // Single appointment
          const apt: Appointment = {
            id: Date.now().toString(),
            service: selectedService,
            date: selectedDate,
            time: selectedTime,
            professional: 'Gaby',
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            packageOption: selectedService.isPackage ? packageOption || undefined : undefined,
          };
          appointmentsToCreate.push(apt);
        }

        // Update local state
        const updatedAppointments = [...appointments, ...appointmentsToCreate];
        setAppointments(updatedAppointments);
        localStorage.setItem('appointments', JSON.stringify(updatedAppointments));

        // Salvar todos no Supabase
        try {
          console.log(`Saving ${appointmentsToCreate.length} appointments to Supabase...`);
          const results = [];
          for (const apt of appointmentsToCreate) {
            console.log(`Saving appointment:`, apt);
            const result = await createAppointment(apt);
            results.push(result);
            console.log(`Appointment saved:`, result);
          }
          console.log(`All ${results.length} appointments saved successfully`);
        } catch (err) {
          console.error('Erro ao salvar no Supabase:', err);
          alert(`Erro ao salvar agendamentos: ${err.message}`);
        }
      }
      setShowConfirmation(true);
    } else {
      alert('Por favor, preencha todos os campos obrigatórios');
    }
  };

  const handleNewAppointment = () => {
    setSelectedService(null);
    setPackageOption(null);
    setSelectedDate(null);
    setSelectedProfessional(null);
    setSelectedTime(null);
    setFormData({ firstName: '', lastName: '', phone: '' });
    setShowConfirmation(false);
    setReschedulingAppointment(null);
    setIsSelectingNewDate(false);
  };

  const handleReschedule = (appointment: Appointment) => {
    setReschedulingAppointment(appointment);
    setSelectedService(appointment.service);
    setPackageOption(appointment.packageOption || null);
    setSelectedDate(appointment.date);
    setIsSelectingNewDate(true); // Enable date selection mode
    setSelectedProfessional('1');
    setSelectedTime(appointment.time);
    setFormData({
      firstName: appointment.firstName,
      lastName: appointment.lastName,
      phone: appointment.phone,
    });
    setShowManageAppointments(false);
  };

  if (showManageAppointments) {
    return (
      <ManageAppointments
        onClose={() => setShowManageAppointments(false)}
        onReschedule={handleReschedule}
      />
    );
  }

  if (showConfirmation) {
    return (
      <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-4 sm:py-6 md:py-8">
            <ImageWithFallback 
              src={logoImage} 
              alt="Gabriela Rolemberg - Manicure & Pedicure" 
              className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 mx-auto mb-3 sm:mb-4 rounded-full"
            />
          </div>

          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-5 sm:p-6 md:p-8 text-center border border-gray-100">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full mb-3 sm:mb-4 border-2 border-black">
              <span className="text-3xl sm:text-4xl">✓</span>
            </div>
            <h2 className="text-black mb-2">{reschedulingAppointment ? 'Remarcação Confirmada!' : 'Agendamento Confirmado!'}</h2>
            <p className="text-gray-500 mb-4 sm:mb-6 text-sm sm:text-base">Seu horário foi reservado com sucesso</p>
            <div className="space-y-2 sm:space-y-3 text-left bg-gray-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-100">
              <div className="flex justify-between border-b border-gray-200 pb-2 text-sm sm:text-base">
                <span className="text-gray-600">Serviço:</span>
                <span className="text-black text-right">{selectedService?.name}</span>
              </div>
              {packageOption && (
                <div className="flex justify-between border-b border-gray-200 pb-2 text-sm sm:text-base">
                  <span className="text-gray-600">Frequência:</span>
                  <span className="text-black">{packageOption}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-gray-200 pb-2 text-sm sm:text-base">
                <span className="text-gray-600">Data:</span>
                <span className="text-black">{selectedDate}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2 text-sm sm:text-base">
                <span className="text-gray-600">Horário:</span>
                <span className="text-black">{selectedTime}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2 text-sm sm:text-base">
                <span className="text-gray-600">Profissional:</span>
                <span className="text-black">Gaby</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2 text-sm sm:text-base">
                <span className="text-gray-600">Cliente:</span>
                <span className="text-black text-right">{formData.firstName} {formData.lastName}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2 text-sm sm:text-base">
                <span className="text-gray-600">Telefone:</span>
                <span className="text-black">{formData.phone}</span>
              </div>
              <div className="flex justify-between pt-2 text-sm sm:text-base">
                <span className="text-gray-600">Valor:</span>
                <span className="text-black">R$ {selectedService?.price},00</span>
              </div>
            </div>
            <button
              onClick={handleNewAppointment}
              className="w-full bg-black text-white py-3 sm:py-4 rounded-xl hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <Sparkles size={18} className="sm:w-5 sm:h-5" />
              Fazer Novo Agendamento
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Logo */}
        <div className="text-center py-4 sm:py-6 md:py-8">
          <ImageWithFallback 
            src={logoImage} 
            alt="Gabriela Rolemberg - Manicure & Pedicure" 
            className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 mx-auto mb-3 sm:mb-4 rounded-full"
          />
        </div>

        {/* Botão Gerenciar Agendamentos */}
        {!selectedService && !reschedulingAppointment && (
          <div className="flex justify-center mb-4">
            <button
              onClick={() => setShowManageAppointments(true)}
              className="bg-white text-black px-5 py-2.5 rounded-xl hover:bg-gray-100 transition-colors border-2 border-gray-200 flex items-center gap-2 text-sm sm:text-base shadow-md"
            >
              <Calendar size={18} />
              Gerenciar Agendamentos
            </button>
          </div>
        )}

        {/* Serviços */}
        {!selectedService && !reschedulingAppointment && (
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-5 sm:p-6 md:p-8 mb-6 sm:mb-8 border border-gray-100">
            <h2 className="text-black mb-4 sm:mb-6 text-center">Escolha seu serviço</h2>
            <div className="space-y-2 sm:space-y-3">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => handleServiceSelect(service)}
                  className="w-full bg-black text-white p-4 sm:p-5 rounded-xl sm:rounded-2xl hover:bg-gray-800 transition-all shadow-md hover:shadow-xl relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform"></div>
                  <div className="flex justify-between items-center relative z-10 gap-3">
                    <div className="text-left flex-1">
                      <div className="flex items-center gap-2 text-sm sm:text-base">
                        <Sparkles size={14} className="opacity-70 flex-shrink-0 sm:w-4 sm:h-4" />
                        <span>{service.name}</span>
                      </div>
                      <div className="text-xs sm:text-sm opacity-70 mt-1">{service.duration}</div>
                    </div>
                    <div className="text-base sm:text-xl flex-shrink-0">R$ {service.price}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Opções do Pacote Mensal */}
        {selectedService?.isPackage && !packageOption && (
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-5 sm:p-6 md:p-8 mb-6 sm:mb-8 border border-gray-100">
            <button
              onClick={() => setSelectedService(null)}
              className="text-gray-600 mb-3 sm:mb-4 hover:text-black transition-colors flex items-center gap-1 text-sm sm:text-base"
            >
              ← Voltar aos serviços
            </button>
            <div className="mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-gray-100">
              <h2 className="text-black mb-2 text-base sm:text-xl">
                {selectedService.name}
              </h2>
              <p className="text-gray-500 text-sm sm:text-base">R$ {selectedService.price},00</p>
            </div>
            <h3 className="text-gray-700 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
              <Sparkles size={16} className="sm:w-[18px] sm:h-[18px]" />
              Escolha a frequência:
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => handlePackageOptionSelect('A cada 15 dias')}
                className="w-full bg-gray-100 text-black p-4 sm:p-5 rounded-xl sm:rounded-2xl hover:bg-black hover:text-white transition-all border border-gray-200 hover:border-black text-sm sm:text-base"
              >
                A cada 15 dias
              </button>
              <button
                onClick={() => handlePackageOptionSelect('A cada 20 dias')}
                className="w-full bg-gray-100 text-black p-4 sm:p-5 rounded-xl sm:rounded-2xl hover:bg-black hover:text-white transition-all border border-gray-200 hover:border-black text-sm sm:text-base"
              >
                A cada 20 dias
              </button>
            </div>
          </div>
        )}

        {/* Seleção de Data */}
        {selectedService && (!selectedService.isPackage || packageOption) && (!selectedDate || isSelectingNewDate) && (
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-5 sm:p-6 md:p-8 mb-6 sm:mb-8 border border-gray-100">
            <button
              onClick={() => selectedService.isPackage ? setPackageOption(null) : setSelectedService(null)}
              className="text-gray-600 mb-3 sm:mb-4 hover:text-black transition-colors flex items-center gap-1 text-sm sm:text-base"
            >
              ← {selectedService.isPackage ? 'Voltar à frequência' : 'Voltar aos serviços'}
            </button>
            <div className="mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-gray-100">
              <h2 className="text-black mb-2 text-base sm:text-xl">
                {selectedService.name}
              </h2>
              {packageOption && (
                <p className="text-gray-600 text-xs sm:text-sm mb-1">{packageOption}</p>
              )}
              <p className="text-gray-500 text-sm sm:text-base">R$ {selectedService.price},00</p>
            </div>
            <h3 className="text-gray-700 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
              <Sparkles size={16} className="sm:w-[18px] sm:h-[18px]" />
              Escolha a data:
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {filterFutureDates(availableDates)
                .filter(date => hasAvailableTimeSlot(date, selectedService, appointments))
                .map((date) => (
                  <button
                    key={date}
                    onClick={() => handleDateSelect(date)}
                    className="bg-gray-100 text-black p-3 sm:p-4 rounded-xl sm:rounded-2xl hover:bg-black hover:text-white transition-all border border-gray-200 hover:border-black text-sm sm:text-base"
                  >
                    {date}
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Seleção de Profissional - Apenas para serviços não-pacote */}
        {selectedDate && !selectedProfessional && !selectedService?.isPackage && !reschedulingAppointment && (
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-5 sm:p-6 md:p-8 mb-6 sm:mb-8 border border-gray-100">
            <button
              onClick={() => setSelectedDate(null)}
              className="text-gray-600 mb-3 sm:mb-4 hover:text-black transition-colors flex items-center gap-1 text-sm sm:text-base"
            >
              ← Voltar às datas
            </button>
            <div className="mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-gray-100">
              <h2 className="text-black mb-2 text-base sm:text-xl">Data: {selectedDate}</h2>
            </div>
            <h3 className="text-gray-700 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
              <Sparkles size={16} className="sm:w-[18px] sm:h-[18px]" />
              Escolha a profissional:
            </h3>
            <div className="space-y-2 sm:space-y-3">
              {professionals.map((professional) => (
                <button
                  key={professional.id}
                  onClick={() => handleProfessionalSelect(professional.id)}
                  className="w-full bg-gray-100 text-black p-4 sm:p-5 rounded-xl sm:rounded-2xl hover:bg-black hover:text-white transition-all border border-gray-200 hover:border-black flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <span className="text-xl sm:text-2xl">💅</span>
                  {professional.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Seleção de Horário - Para pacotes (sem profissional) ou para serviços normais com profissional selecionado */}
        {selectedDate && selectedTime === null && (selectedService?.isPackage || selectedProfessional || reschedulingAppointment) && (
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-5 sm:p-6 md:p-8 mb-6 sm:mb-8 border border-gray-100">
            <button
              onClick={() => {
                if (reschedulingAppointment) {
                  setIsSelectingNewDate(true); // Enable date selection mode
                } else if (!selectedService?.isPackage) {
                  setSelectedProfessional(null);
                } else {
                  setSelectedDate(null);
                }
              }}
              className="text-gray-600 mb-3 sm:mb-4 hover:text-black transition-colors flex items-center gap-1 text-sm sm:text-base"
            >
              ← Voltar {reschedulingAppointment ? 'às datas' : (!selectedService?.isPackage ? 'aos profissionais' : 'às datas')}
            </button>
            <div className="mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-gray-100">
              <h2 className="text-black mb-2 text-base sm:text-xl">Profissional: Gaby</h2>
            </div>
            <h3 className="text-gray-700 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
              <Sparkles size={16} className="sm:w-[18px] sm:h-[18px]" />
              Escolha o horário:
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
              {availableTimes.map((time) => {
                // For packages, use the individual service duration (1 hour); for normal services, use the selected duration
                const checkDuration = selectedService?.isPackage ? '1 hora' : selectedService?.duration || '';
                const isAvailable = selectedService ? isTimeSlotAvailable(selectedDate || '', time, checkDuration, appointments) : true;
                return (
                  <button
                    key={time}
                    onClick={() => handleTimeSelect(time)}
                    disabled={!isAvailable}
                    className={`p-2.5 sm:p-3 rounded-lg sm:rounded-xl text-sm sm:text-base transition-all border ${
                      isAvailable
                        ? 'bg-gray-100 text-black hover:bg-black hover:text-white border-gray-200 hover:border-black cursor-pointer'
                        : 'bg-gray-300 text-gray-500 border-gray-300 cursor-not-allowed opacity-50'
                    }`}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Formulário de Agendamento */}
        {selectedTime && (
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-5 sm:p-6 md:p-8 mb-6 sm:mb-8 border border-gray-100">
            <button
              onClick={() => setSelectedTime(null)}
              className="text-gray-600 mb-3 sm:mb-4 hover:text-black transition-colors flex items-center gap-1 text-sm sm:text-base"
            >
              ← Voltar aos horários
            </button>
            <div className="mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-gray-100">
              <h2 className="text-black mb-2 text-base sm:text-xl">Horário: {selectedTime}</h2>
            </div>
            <h3 className="text-gray-700 mb-4 sm:mb-6 flex items-center gap-2 text-sm sm:text-base">
              <Sparkles size={16} className="sm:w-[18px] sm:h-[18px]" />
              {reschedulingAppointment ? 'Confirme a remarcação:' : 'Complete seu agendamento:'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {!reschedulingAppointment && (
                <>
                  <div>
                    <label className="block text-gray-700 mb-2 sm:mb-3 text-sm sm:text-base">Nome e Sobrenome</label>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <input
                        type="text"
                        placeholder="Nome"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        required
                        className="flex-1 border-2 border-gray-200 rounded-xl p-3 focus:outline-none focus:border-black transition-colors bg-gray-50 focus:bg-white text-sm sm:text-base"
                      />
                      <input
                        type="text"
                        placeholder="Sobrenome"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        required
                        className="flex-1 border-2 border-gray-200 rounded-xl p-3 focus:outline-none focus:border-black transition-colors bg-gray-50 focus:bg-white text-sm sm:text-base"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2 sm:mb-3 text-sm sm:text-base">Celular (DDD + Número)</label>
                    <input
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      className="w-full border-2 border-gray-200 rounded-xl p-3 focus:outline-none focus:border-black transition-colors bg-gray-50 focus:bg-white text-sm sm:text-base"
                    />
                  </div>
                </>
              )}
              {reschedulingAppointment && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-sm">
                  <p className="text-gray-700">
                    <strong>Cliente:</strong> {formData.firstName} {formData.lastName}
                  </p>
                  <p className="text-gray-700 mt-1">
                    <strong>Telefone:</strong> {formData.phone}
                  </p>
                </div>
              )}
              <button
                type="submit"
                className="w-full bg-black text-white py-3 sm:py-4 rounded-xl hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <Sparkles size={18} className="sm:w-5 sm:h-5" />
                {reschedulingAppointment ? 'Confirmar Remarcação' : 'Agendar'}
              </button>
            </form>
          </div>
        )}

        {/* Links Sociais */}
        <div className="flex justify-center gap-6 sm:gap-8 py-6 sm:py-8">
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 sm:gap-2 text-black hover:text-gray-600 transition-colors group"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all border-2 border-gray-200 group-hover:border-black">
              <Instagram size={24} className="sm:w-7 sm:h-7" />
            </div>
            <span className="text-xs sm:text-sm">Instagram</span>
          </a>
          <a
            href="https://wa.me/5511999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 sm:gap-2 text-black hover:text-gray-600 transition-colors group"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all border-2 border-gray-200 group-hover:border-black">
              <Phone size={24} className="sm:w-7 sm:h-7" />
            </div>
            <span className="text-xs sm:text-sm">WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
}
