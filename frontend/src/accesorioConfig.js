// Config compartida entre Dashboard.jsx y EquiposList.jsx para las tarjetas
// de stock de accesorios (una por categoría). Solo audífonos tiene un
// segundo atributo distintivo (tipo de conexión); monitores y celulares
// quedan en modelo + cantidad.
export const AUDIFONO_TIPOS = [
  { value: 'bluetooth', label: 'Bluetooth' },
  { value: 'usb_2.4ghz', label: 'USB 2.4GHz' },
];
