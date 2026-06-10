/**
 * Sistema de Narración de Audio
 * Usa Web Speech API para sintetizar voz
 */

const audioDescriptions = {
  'Flotador Izquierdo': 'Este es el flotador izquierdo, hecho de icopor, proporciona flotabilidad lateral izquierda al sistema.',
  'Flotador Central': 'El flotador central es el principal soporte de flotabilidad, hecho de icopor de alta densidad.',
  'Flotador Derecho': 'Este es el flotador derecho, que proporciona flotabilidad lateral derecha al sistema flotante.',
  'Polea de Anclaje': 'La polea de anclaje permite fijar el sistema al fondo del reservorio mediante cuerda o cable.',
  'Cuerda de Amarre': 'La cuerda de amarre sujeta todo el sistema al fondo, manteniéndolo en posición fija.',
  'Caja Principal': 'La caja principal es el contenedor estanco que protege los sensores del agua del reservorio.',
  'Divisor Horizontal': 'El divisor horizontal separa las secciones internas de la caja para organizar los componentes.',
  'Divisor Vertical': 'El divisor vertical proporciona estructura interna y separa las zonas de sensores.',
  'Sensor pH': 'El sensor pH mide la acidez o alcalinidad del agua, crucial para entender la calidad hídrica.',
  'Sensor Turbidez': 'El sensor de turbidez mide la claridad del agua, detectando partículas suspendidas.',
  'Sensor TDS': 'El sensor TDS mide los sólidos disueltos totales, indicando la salinidad del agua.',
  'Sensor Nivel': 'El sensor de nivel mide la profundidad y volumen de agua en el reservorio.',
  'Tubería Principal': 'La tubería principal permite la circulación de agua a través del sistema de sensores.',
  'Tubería Auxiliar Izq': 'Esta tubería auxiliar distribuye el agua hacia los sensores del lado izquierdo.',
  'Tubería Auxiliar Der': 'Esta tubería auxiliar distribuye el agua hacia los sensores del lado derecho.',
  'Zona Electrónica': 'La zona electrónica contiene todos los componentes de procesamiento y comunicación.',
  'Microcontrolador ESP32': 'El ESP32 es el cerebro del sistema, procesa datos de los sensores en tiempo real.',
  'Batería 12V': 'La batería de 12 voltios proporciona energía al microcontrolador y sensores.',
  'Antena WiFi': 'La antena WiFi transmite los datos recopilados a la estación base de manera inalámbrica.',
  'LED pH': 'Este LED indicador muestra el estado del sensor de pH mediante luz visible.',
  'LED Turbidez': 'Este LED indicador muestra el estado del sensor de turbidez.',
  'LED TDS': 'Este LED indicador muestra el estado del sensor TDS o salinidad.',
  'LED WiFi': 'Este LED indicador muestra el estado de la conexión WiFi del sistema.',
  'Línea de Flotación': 'La línea de flotación indica la profundidad a la que flota el sistema en el agua.'
};

class AudioManager {
  constructor() {
    this.synth = window.speechSynthesis;
    this.isPlaying = false;
    this.currentComponent = null;
  }

  speak(componentName) {
    // Detener audio anterior si está jugando
    if (this.isPlaying) {
      this.synth.cancel();
    }

    const text = audioDescriptions[componentName];
    if (!text) {
      console.log('No hay descripción para:', componentName);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 0.95; // Velocidad un poco más lenta
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    this.isPlaying = true;
    this.currentComponent = componentName;

    // Marcar botón como reproduciendo
    this.markButtonPlaying(componentName);

    utterance.onend = () => {
      this.isPlaying = false;
      this.currentComponent = null;
      this.unmarkButtonPlaying(componentName);
    };

    utterance.onerror = (error) => {
      console.log('Error en síntesis de voz:', error);
      this.isPlaying = false;
      this.unmarkButtonPlaying(componentName);
    };

    this.synth.speak(utterance);
  }

  markButtonPlaying(componentName) {
    const btn = document.querySelector(`[data-component="${componentName}"]`);
    if (btn) {
      btn.classList.add('playing');
    }
  }

  unmarkButtonPlaying(componentName) {
    const btn = document.querySelector(`[data-component="${componentName}"]`);
    if (btn) {
      btn.classList.remove('playing');
    }
  }

  stopAudio() {
    if (this.isPlaying) {
      this.synth.cancel();
      this.isPlaying = false;
      if (this.currentComponent) {
        this.unmarkButtonPlaying(this.currentComponent);
      }
    }
  }
}

// Inicializar manager de audio global
const audioManager = new AudioManager();
