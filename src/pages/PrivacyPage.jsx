import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'

export function PrivacyPage() {
  return (
    <div className="scroll-y-app safe-top safe-x flex min-h-full flex-col bg-warm-white px-6 py-8">
      <Logo size="sm" className="mx-auto mb-6 shrink-0" />

      <article className="mx-auto w-full max-w-lg space-y-5 pb-10">
        <header>
          <h1 className="font-display text-2xl font-bold text-ink">Política de Privacidad</h1>
          <p className="mt-2 text-sm text-muted">Última actualización: mayo 2026</p>
        </header>

        <section className="space-y-3 text-sm leading-6 text-ink/90">
          <p>
            Esta política describe cómo Album Figuritas San Fernando recopila, usa y protege tus
            datos personales cuando usás la aplicación.
          </p>

          <h2 className="pt-2 text-base font-bold text-ink">Datos que recopilamos</h2>
          <p>
            Podemos recopilar nombre, apellido, DNI, email, celular, username, dirección declarada,
            fotos de figuritas capturadas, ubicación aproximada al capturar y datos técnicos de
            uso (dispositivo, fecha y hora de actividad).
          </p>

          <h2 className="pt-2 text-base font-bold text-ink">Para qué usamos tus datos</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Crear y administrar tu cuenta de participante.</li>
            <li>Validar capturas, progreso del álbum y eventual entrega de premios.</li>
            <li>Mejorar la experiencia del juego y la seguridad de la plataforma.</li>
            <li>Comunicaciones relacionadas con tu participación en la campaña.</li>
          </ul>

          <h2 className="pt-2 text-base font-bold text-ink">Compartición</h2>
          <p>
            No vendemos tus datos. Podemos compartirlos con proveedores necesarios para operar la
            app (por ejemplo, hosting y autenticación) bajo obligaciones de confidencialidad, o
            cuando la ley lo exija.
          </p>

          <h2 className="pt-2 text-base font-bold text-ink">Conservación y seguridad</h2>
          <p>
            Conservamos los datos mientras dure tu participación y el tiempo necesario para
            cumplir obligaciones legales. Aplicamos medidas razonables para proteger la información
            contra accesos no autorizados.
          </p>

          <h2 className="pt-2 text-base font-bold text-ink">Tus derechos</h2>
          <p>
            Podés solicitar acceso, rectificación o eliminación de tus datos contactando al
            organizador de la campaña, sujeto a la normativa aplicable.
          </p>

          <h2 className="pt-2 text-base font-bold text-ink">Contacto</h2>
          <p>
            Para consultas sobre privacidad, escribinos a través de los canales oficiales del
            organizador de Album Figuritas San Fernando.
          </p>
        </section>

        <Link to="/login" className="inline-block text-sm font-semibold text-ink underline">
          Volver
        </Link>
      </article>
    </div>
  )
}
