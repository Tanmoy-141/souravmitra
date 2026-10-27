export const DEFAULT_CONTACT_PAGE_HTML = `
<div class="contact-page-wrapper" data-component="contact-wrapper" data-card-bg="#DBDBDB" data-card-color="#000000" data-card-hover="lift" data-btn-bg="#DBDBDB" data-btn-color="#000000" data-input-border="#FFFFFF" style="width: 100%; max-width: 960px; margin: 2rem auto; padding: 1rem; box-sizing: border-box; display: flex; flex-direction: row; flex-wrap: wrap; gap: 2rem; justify-content: center; align-items: stretch; font-family: sans-serif;">
  <!-- Left Card with hover lift and luminous ambient glow -->
  <div class="contact-card" data-component="contact-card" data-card-bg="#DBDBDB" data-card-color="#000000" data-card-hover="lift" style="background-color: #DBDBDB; color: #000000; padding: 2.5rem 2.25rem; width: 100%; max-width: 340px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; border-radius: 0; cursor: pointer; transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);">
    <div>
      <h1 style="font-size: 2.25rem; font-weight: 500; margin: 0 0 1.25rem 0; line-height: 1.15; color: inherit;">Hello,</h1>
      <div style="font-size: 0.85rem; line-height: 1.6; margin: 0 0 1.5rem 0; color: inherit; opacity: 0.9;">
        <p style="margin: 0 0 1rem 0;">
          Got a story that needs a<br>cover? An idea you'd like<br>illustrated? Or just want to<br>share what you felt looking at<br>my work?
        </p>
        <p style="margin: 0;">I'd love to hear from you.</p>
      </div>
    </div>
    <div style="margin-top: 2rem;">
      <p style="font-size: 0.85rem; margin: 0 0 1.25rem 0; color: inherit; font-weight: 400;">
        <a href="mailto:souravmitra045@gmail.com" style="color: inherit; text-decoration: none;">souravmitra045@gmail.com</a>
      </p>
      <div class="contact-social-icons-row" style="display: flex; gap: 0.5rem; align-items: center;">
        <a href="#" class="contact-social-icon" style="display: inline-flex; width: 24px; height: 24px; background: #000000; border-radius: 50%; align-items: center; justify-content: center; color: #FFFFFF; font-size: 11px; font-weight: bold; text-decoration: none;">f</a>
        <a href="#" class="contact-social-icon" style="display: inline-flex; width: 24px; height: 24px; background: #000000; border-radius: 50%; align-items: center; justify-content: center; color: #FFFFFF; font-size: 11px; font-weight: bold; text-decoration: none;">ig</a>
        <a href="#" class="contact-social-icon" style="display: inline-flex; width: 24px; height: 24px; background: #000000; border-radius: 50%; align-items: center; justify-content: center; color: #FFFFFF; font-size: 11px; font-weight: bold; text-decoration: none;">Bē</a>
        <a href="#" class="contact-social-icon" style="display: inline-flex; width: 24px; height: 24px; background: #000000; border-radius: 50%; align-items: center; justify-content: center; color: #FFFFFF; font-size: 11px; font-weight: bold; text-decoration: none;">in</a>
        <a href="#" class="contact-social-icon" style="display: inline-flex; width: 24px; height: 24px; background: #000000; border-radius: 50%; align-items: center; justify-content: center; color: #FFFFFF; font-size: 11px; font-weight: bold; text-decoration: none;">𝕏</a>
        <a href="#" class="contact-social-icon" style="display: inline-flex; width: 24px; height: 24px; background: #000000; border-radius: 50%; align-items: center; justify-content: center; color: #FFFFFF; font-size: 11px; font-weight: bold; text-decoration: none;">P</a>
      </div>
    </div>
  </div>

  <!-- Right Form Container -->
  <div class="contact-form-container" data-cms-block="contact-form" data-btn-bg="#DBDBDB" data-btn-color="#000000" data-input-border="#FFFFFF" style="width: 100%; max-width: 450px; display: flex; flex-direction: column; gap: 1rem; box-sizing: border-box; justify-content: center;">
    <div class="contact-form-grid-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
      <div>
        <label class="contact-form-label" data-label-first-name style="display: block; color: #FFFFFF; font-size: 0.8rem; margin-bottom: 0.35rem;">First Name *</label>
        <div class="contact-mock-input" style="background: #000000; border: 1px solid #FFFFFF; height: 34px; width: 100%; box-sizing: border-box; display: block;"></div>
      </div>
      <div>
        <label class="contact-form-label" data-label-last-name style="display: block; color: #FFFFFF; font-size: 0.8rem; margin-bottom: 0.35rem;">Last Name *</label>
        <div class="contact-mock-input" style="background: #000000; border: 1px solid #FFFFFF; height: 34px; width: 100%; box-sizing: border-box; display: block;"></div>
      </div>
    </div>
    <div>
      <label class="contact-form-label" data-label-email style="display: block; color: #FFFFFF; font-size: 0.8rem; margin-bottom: 0.35rem;">Email *</label>
      <div class="contact-mock-input" style="background: #000000; border: 1px solid #FFFFFF; height: 34px; width: 100%; box-sizing: border-box; display: block;"></div>
    </div>
    <div>
      <label class="contact-form-label" data-label-message style="display: block; color: #FFFFFF; font-size: 0.8rem; margin-bottom: 0.35rem;">Message</label>
      <div class="contact-mock-textarea" style="background: #000000; border: 1px solid #FFFFFF; height: 75px; width: 100%; box-sizing: border-box; display: block;"></div>
    </div>
    <div class="contact-roles-row" style="display: flex; justify-content: center; align-items: center; gap: 1.5rem; padding: 0.25rem 0;">
      <span class="contact-role-item" data-role-option style="color: #FFFFFF; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.4rem;">
        <span class="contact-radio-dot" style="display: inline-block; width: 13px; height: 13px; border-radius: 50%; border: 1px solid #FFFFFF;"></span> Publisher
      </span>
      <span class="contact-role-item" data-role-option style="color: #FFFFFF; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.4rem;">
        <span class="contact-radio-dot" style="display: inline-block; width: 13px; height: 13px; border-radius: 50%; border: 1px solid #FFFFFF;"></span> Writer
      </span>
      <span class="contact-role-item" data-role-option style="color: #FFFFFF; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.4rem;">
        <span class="contact-radio-dot" style="display: inline-block; width: 13px; height: 13px; border-radius: 50%; border: 1px solid #FFFFFF;"></span> Individual
      </span>
    </div>
    <div class="contact-submit-btn" data-submit-btn style="background-color: #DBDBDB; color: #000000; text-align: center; padding: 0.65rem 1rem; font-size: 0.85rem; font-weight: 500; cursor: pointer; width: 100%; display: block; box-sizing: border-box;">
      Send
    </div>
  </div>
</div>
`.trim();
