import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'

export function TermsPage() {
  return (
    <div className="scroll-y-app safe-top safe-x flex min-h-full flex-col bg-warm-white px-6 py-8">
      <Logo size="sm" className="mx-auto mb-6 shrink-0" />

      <article className="mx-auto w-full max-w-lg space-y-5 pb-10">
        <header>
          <h1 className="font-display text-2xl font-bold text-ink">Términos y Condiciones</h1>
          <p className="mt-2 text-sm text-muted">Última actualización: mayo 2026</p>
        </header>

        <section className="space-y-3 text-sm leading-6 text-ink/90">
          <p>
            Al registrarte y usar Album Figuritas San Fernando aceptás estos términos. Si no estás
            de acuerdo, no uses la aplicación.
          </p>

          <h2 className="pt-2 text-base font-bold text-ink">Participación</h2>
          <p>
            La app permite completar un álbum digital de figuritas mediante capturas en puntos
            habilitados. La participación puede estar sujeta a reglas adicionales publicadas por el
            organizador de la campaña.
          </p>

          <h2 className="pt-2 text-base font-bold text-ink">Cuenta y veracidad</h2>
          <p>
            Sos responsable de la información que cargás en tu perfil. Los datos falsos o el uso
            fraudulento pueden resultar en la suspensión de la cuenta y la anulación del progreso.
          </p>

          <h2 className="pt-2 text-base font-bold text-ink">Capturas y contenido</h2>
          <p>
            Al subir fotos otorgás una licencia no exclusiva para que el organizador las utilice con
            fines de validación, moderación y difusión de la campaña. No subas contenido ilegal,
            ofensivo o que viole derechos de terceros.
          </p>

          <h2 className="pt-2 text-base font-bold text-ink">Uso permitido</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>No manipular ubicación, capturas ni progreso de forma fraudulenta.</li>
            <li>No intentar acceder a áreas restringidas del sistema.</li>
            <li>Respetar a otros participantes y al personal de moderación.</li>
          </ul>

          <h2 className="pt-2 text-base font-bold text-ink">Premios y revisión</h2>
          <p>
            El estado del álbum puede requerir revisión manual. El organizador se reserva el
            derecho de aprobar o rechazar participaciones que no cumplan las reglas.
          </p>

          <h2 className="pt-2 text-base font-bold text-ink">Limitación de responsabilidad</h2>
          <p>
            La app se ofrece “tal cual”. No garantizamos disponibilidad ininterrumpida ni
            ausencia de errores. El uso de GPS y servicios de terceros puede variar según tu
            dispositivo y conexión.
          </p>

          <h2 className="pt-2 text-base font-bold text-ink">Modificaciones</h2>
          <p>
            Podemos actualizar estos términos. Los cambios relevantes se comunicarán por la app o
            canales oficiales del organizador.
          </p>
        </section>

        <Link to="/login" className="inline-block text-sm font-semibold text-ink underline">
          Volver
        </Link>
      </article>
    </div>
  )
}
