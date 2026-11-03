import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Monogram from "../components/Monogram";
import { api, ApiError } from "../lib/api";

const rsvpSchema = z.object({
  fullName: z.string().min(2, "Please enter your full name."),
  phoneNumber: z.string().min(7, "Please enter a valid phone number."),
  email: z.string().email("Please enter a valid email.").optional().or(z.literal("")),
  numberOfGuests: z.coerce.number().int().min(1).max(1),
  attendanceStatus: z.enum(["ATTENDING", "NOT_ATTENDING"]),
  capGeleInterest: z.enum(["NONE", "CAP", "GELE"]),
  dietaryRequirements: z.string().optional(),
  specialMessage: z.string().optional(),
});

type RsvpInput = z.input<typeof rsvpSchema>;
type RsvpOutput = z.output<typeof rsvpSchema>;

export default function RsvpPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RsvpInput, unknown, RsvpOutput>({
    resolver: zodResolver(rsvpSchema),
    defaultValues: { attendanceStatus: "ATTENDING", numberOfGuests: 1, capGeleInterest: "NONE" },
  });

  const attendance = watch("attendanceStatus");
  const capGele = watch("capGeleInterest");
  const [formError, setFormError] = useState("");

  // The RSVP form requires a live invitation session; otherwise send guests back to the code page.
  useEffect(() => {
    api("/invitations/session").catch(() => navigate("/invitation", { replace: true }));
  }, [navigate]);

  async function onSubmit(values: RsvpOutput) {
    setFormError("");
    try {
      await api("/guests/rsvp", { method: "POST", body: values });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/invitation", { replace: true });
        return;
      }
      if (err instanceof ApiError && err.fieldErrors) {
        for (const [field, message] of Object.entries(err.fieldErrors)) {
          setError(field as keyof RsvpInput, { message });
        }
      }
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      return;
    }
    navigate("/confirmation", { state: { attendanceStatus: values.attendanceStatus, fullName: values.fullName } });
  }

  const inputClass =
    "w-full bg-ivory border border-plum/20 rounded-sm px-4 py-3 font-sans text-deep-plum placeholder:text-plum/35 focus:border-olive transition-colors";
  const labelClass = "block font-sans text-sm text-deep-plum/80 mb-2";
  const errorClass = "mt-1.5 text-xs text-plum font-sans";

  return (
    <div className="min-h-screen bg-ivory">
      <header className="px-6 sm:px-10 py-6 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-3 text-deep-plum">
          <Monogram className="w-8 h-8" />
        </Link>
        <Link to="/invitation" className="inline-flex items-center gap-2 font-sans text-sm text-deep-plum/70 hover:text-plum transition-colors">
          <ArrowLeft size={16} />
          Back
        </Link>
      </header>

      <main className="px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-xl mx-auto"
        >
          <p className="font-sans text-xs tracking-[0.3em] text-olive text-center mb-4">
            YOUR RSVP
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl text-deep-plum text-center mb-3">
            We&rsquo;d Love to Know
          </h1>
          <p className="font-sans text-sm text-deep-plum/65 text-center mb-10 leading-relaxed max-w-md mx-auto">
            A few details so we can prepare a seat, and a plate, with your name on it.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
            <div>
              <label htmlFor="fullName" className={labelClass}>Full Name</label>
              <input id="fullName" className={inputClass} {...register("fullName")} />
              {errors.fullName && <p className={errorClass}>{errors.fullName.message}</p>}
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="phoneNumber" className={labelClass}>Phone Number</label>
                <input id="phoneNumber" type="tel" className={inputClass} {...register("phoneNumber")} />
                {errors.phoneNumber && <p className={errorClass}>{errors.phoneNumber.message}</p>}
              </div>
              <div>
                <label htmlFor="email" className={labelClass}>Email Address <span className="text-deep-plum/40">(optional)</span></label>
                <input id="email" type="email" className={inputClass} {...register("email")} />
                {errors.email && <p className={errorClass}>{errors.email.message}</p>}
              </div>
            </div>

            <fieldset>
              <legend className={labelClass}>Will you be attending?</legend>
              <div className="grid grid-cols-2 gap-4">
                <label
                  className={`flex items-center justify-center gap-2 border rounded-sm px-4 py-3 cursor-pointer font-sans text-sm transition-colors ${
                    attendance === "ATTENDING"
                      ? "border-olive bg-olive/10 text-deep-olive"
                      : "border-plum/20 text-deep-plum/60"
                  }`}
                >
                  <input type="radio" value="ATTENDING" className="sr-only" {...register("attendanceStatus")} />
                  Joyfully Attending
                </label>
                <label
                  className={`flex items-center justify-center gap-2 border rounded-sm px-4 py-3 cursor-pointer font-sans text-sm transition-colors ${
                    attendance === "NOT_ATTENDING"
                      ? "border-plum bg-plum/10 text-plum"
                      : "border-plum/20 text-deep-plum/60"
                  }`}
                >
                  <input type="radio" value="NOT_ATTENDING" className="sr-only" {...register("attendanceStatus")} />
                  Unable to Attend
                </label>
              </div>
            </fieldset>

            {attendance === "ATTENDING" && (
              <>
                <div>
                  <label htmlFor="numberOfGuests" className={labelClass}>Number of Guests</label>
                  <input
                    id="numberOfGuests"
                    type="number"
                    value={1}
                    readOnly
                    aria-readonly="true"
                    tabIndex={-1}
                    className={`${inputClass} bg-plum/5 text-deep-plum/60 cursor-not-allowed select-none`}
                    {...register("numberOfGuests")}
                  />
                  {errors.numberOfGuests && <p className={errorClass}>{errors.numberOfGuests.message}</p>}
                </div>

                <fieldset>
                  <legend className={labelClass}>
                    Would you be interested in buying a cap or gele?
                  </legend>
                  <div className="grid grid-cols-3 gap-3">
                    {([["NONE", "Not interested"], ["GELE", "Gele"], ["CAP", "Cap"]] as const).map(([value, text]) => (
                      <label
                        key={value}
                        className={`flex items-center justify-center text-center border rounded-sm px-2 py-3 cursor-pointer font-sans text-sm transition-colors ${
                          capGele === value ? "border-olive bg-olive/10 text-deep-olive" : "border-plum/20 text-deep-plum/60"
                        }`}
                      >
                        <input type="radio" value={value} className="sr-only" {...register("capGeleInterest")} />
                        {text}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div>
                  <label htmlFor="dietaryRequirements" className={labelClass}>
                    Dietary Requirements <span className="text-deep-plum/40">(optional)</span>
                  </label>
                  <input id="dietaryRequirements" className={inputClass} {...register("dietaryRequirements")} />
                </div>
              </>
            )}

            <div>
              <label htmlFor="specialMessage" className={labelClass}>
                Special Message to the Couple <span className="text-deep-plum/40">(optional)</span>
              </label>
              <textarea
                id="specialMessage"
                rows={4}
                className={inputClass}
                {...register("specialMessage")}
              />
            </div>

            {formError && (
              <p role="alert" className={errorClass}>
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-plum text-ivory font-sans font-medium text-sm px-8 py-4 rounded-sm hover:bg-deep-plum transition-colors duration-300 disabled:opacity-60"
            >
              {isSubmitting ? "Submitting…" : "Submit RSVP"}
            </button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
