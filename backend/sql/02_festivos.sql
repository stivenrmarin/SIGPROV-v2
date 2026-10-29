-- ===========================================================================
-- Calendario de festivos colombianos 2025-2026
-- Fuente: calendario oficial + Ley Emiliani (traslados al lunes)
-- Efecto: -30% ventas por defecto. Semana Santa -90%. Navidad +40%.
-- ===========================================================================

-- 2025 ---------------------------------------------------------------------
INSERT INTO calendario_festivos (fecha, nombre, tipo, efecto_venta) VALUES
    ('2025-01-01', 'Año Nuevo',                          'fin_anio',    0.40),
    ('2025-01-06', 'Día de Reyes',                       'festivo',    -0.30),
    ('2025-03-24', 'Día de San José',              'festivo',    -0.30),
    ('2025-04-13', 'Domingo de Ramos',                       'semana_santa',-0.90),
    ('2025-04-17', 'Jueves Santo',                           'semana_santa',-0.90),
    ('2025-04-18', 'Viernes Santo',                          'semana_santa',-0.90),
    ('2025-04-20', 'Domingo de Resurrección',           'semana_santa',-0.50),
    ('2025-05-01', 'Día del Trabajo',                   'festivo',    -0.30),
    ('2025-06-02', 'Ascensión del Señor',          'puente',     -0.30),
    ('2025-06-23', 'Corpus Christi',                         'festivo',    -0.30),
    ('2025-06-30', 'San Pedro y San Pablo',                  'festivo',    -0.30),
    ('2025-07-20', 'Día de la Independencia',           'festivo',    -0.30),
    ('2025-08-07', 'Batalla de Boyacá',                 'festivo',    -0.30),
    ('2025-08-18', 'Asunción de la Virgen',             'festivo',    -0.30),
    ('2025-10-12', 'Día de la Raza',                    'festivo',    -0.30),
    ('2025-11-03', 'Todos los Santos (trasladado)',          'puente',     -0.30),
    ('2025-11-17', 'Independencia de Cartagena',             'festivo',    -0.30),
    ('2025-12-08', 'Inmaculada Concepción',             'festivo',    -0.30),
    ('2025-12-25', 'Navidad',                                'navidad',     0.40),
    ('2025-12-31', 'Víspera de Año Nuevo',         'fin_anio',    0.40);

-- 2026 ---------------------------------------------------------------------
INSERT INTO calendario_festivos (fecha, nombre, tipo, efecto_venta) VALUES
    ('2026-01-01', 'Año Nuevo',                          'fin_anio',    0.40),
    ('2026-01-12', 'Día de Reyes (trasladado)',         'puente',     -0.30),
    ('2026-03-23', 'Día de San José (trasladado)', 'puente',     -0.30),
    ('2026-04-02', 'Jueves Santo',                           'semana_santa',-0.90),
    ('2026-04-03', 'Viernes Santo',                          'semana_santa',-0.90),
    ('2026-04-05', 'Domingo de Resurrección',           'semana_santa',-0.50),
    ('2026-05-01', 'Día del Trabajo',                   'festivo',    -0.30),
    ('2026-05-25', 'Ascensión del Señor',          'puente',     -0.30),
    ('2026-06-15', 'Corpus Christi (trasladado)',            'puente',     -0.30),
    ('2026-06-29', 'San Pedro y San Pablo (trasladado)',     'puente',     -0.30),
    ('2026-07-20', 'Día de la Independencia',           'festivo',    -0.30),
    ('2026-08-07', 'Batalla de Boyacá',                 'festivo',    -0.30),
    ('2026-08-17', 'Asunción de la Virgen (trasladado)','puente',     -0.30),
    ('2026-10-12', 'Dê de la Raza',                     'festivo',    -0.30),
    ('2026-11-02', 'Todos los Santos (trasladado)',          'puente',     -0.30),
    ('2026-11-16', 'Independencia de Cartagena (trasladado)','puente',     -0.30),
    ('2026-12-08', 'Inmaculada Concepción',             'festivo',    -0.30),
    ('2026-12-25', 'Navidad',                                'navidad',     0.40),
    ('2026-12-31', 'Víspera de Año Nuevo',         'fin_anio',    0.40);

-- Verificación
SELECT 'Festivos cargados: ' || COUNT(*) FROM calendario_festivos;