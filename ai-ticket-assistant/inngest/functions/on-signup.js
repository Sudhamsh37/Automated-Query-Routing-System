import { inngest } from "../client.js";
import User from "../../models/user.js";
import { NonRetriableError } from "inngest";
import { sendMail } from "../../utils/mailer.js";

export const onUserSignup = inngest.createFunction(
  { id: "on-user-signup", retries: 2 }, // If the function fails, it will retry 2 times and id is unique identifier for this function
  { event: "user/signup" },
  async ({ event, step }) => {
    try {
      // Destructure email from the event data
      // This assumes the event payload looks like: { data: { email: "user@example.com" } }
      const { email } = event.data;
      // Step 1: Fetch user from the database
      const user = await step.run("get-user-email", async () => {
        // Query MongoDB using the User model
        const userObject = await User.findOne({ email });

        // If no user is found, throw a NonRetriableError
        // NonRetriableError means Inngest will NOT retry this step
        if (!userObject) {
          throw new NonRetriableError("User no longer exists in our database");
        }

        // Return the user object to be used in the next step
        return userObject;
      });
      // Step 2: Send welcome email
      await step.run("send-welcome-email", async () => {
        const subject = `Welcome to the app`;
        const message = `Hi,
            \n\n
            Thanks for signing up. We're glad to have you onboard!
            `;
        // Use the sendMail utility to send the email to the user
        await sendMail(user.email, subject, message);
      });

      // here we are building 2  step pipeline , we can build any steps by using same approach..

      return { success: true };
    } catch (error) {
      console.error("❌ Error running step", error.message);
      return { success: false };
    }
  }
);