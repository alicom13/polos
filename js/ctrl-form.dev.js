/*!
 * CtrlForm v1.0 - Form Control JS Library
 * Form Controls: Input, Textarea, Select, Checkbox, Radio, Validation States
 * @copyright  2025 CtrlForm Style
 * @author     Ali Musthofa
 * @link       https://github.com/alicom13/polos
 * @license    MIT
 */

(function() {
    'use strict';
    
    /**
     * CtrlForm - Main class untuk form controls
     * @class
     */
    class CtrlForm {
        constructor() {
            console.log('🚀 CtrlForm initializing...');
            this.init();
        }
        
        /**
         * Initialize semua form controls
         * @private
         */
        init() {
            this.initPasswordToggle();
            this.initValidation();
            this.initFloatingLabels();
            console.log('✅ CtrlForm initialized successfully');
        }
        
        /**
         * Inisialisasi toggle password visibility
         * @private
         */
        initPasswordToggle() {
            console.log('🔐 Initializing password toggle...');
            document.querySelectorAll('.toggle-password').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const input = btn.closest('.input-group').querySelector('.ctrl-form[type="password"], .ctrl-form[type="text"]');
                    if (!input) {
                        console.warn('⚠️ Password input not found');
                        return;
                    }
                    
                    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                    input.setAttribute('type', type);
                    
                    // Update icon
                    const icon = btn.querySelector('i');
                    if (icon) {
                        icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
                    }
                    
                    // Focus kembali ke input
                    input.focus();
                    console.log('👁️ Password visibility toggled');
                });
            });
        }
        
        /**
         * Inisialisasi form validation
         * @private
         */
        initValidation() {
            console.log('📝 Initializing form validation...');
            
            // Validasi real-time pada blur
            document.addEventListener('blur', (e) => {
                if (e.target.classList.contains('ctrl-form')) {
                    this.validateField(e.target);
                }
            }, true);
            
            // Clear validation pada input
            document.addEventListener('input', (e) => {
                if (e.target.classList.contains('ctrl-form') && e.target.classList.contains('is-invalid')) {
                    e.target.classList.remove('is-invalid');
                    const feedback = e.target.closest('.form-group')?.querySelector('.invalid-feedback');
                    if (feedback) feedback.style.display = 'none';
                }
            }, true);
        }
        
        /**
         * Inisialisasi floating labels
         * @private
         */
        initFloatingLabels() {
            console.log('🏷️ Initializing floating labels...');
            document.querySelectorAll('.form-floating .ctrl-form').forEach(input => {
                // Inisialisasi state awal
                if (input.value.trim() !== '') {
                    const label = input.parentElement.querySelector('label');
                    if (label) label.classList.add('active');
                }
                
                // Update pada input
                input.addEventListener('input', () => {
                    const label = input.parentElement.querySelector('label');
                    if (label) {
                        label.classList.toggle('active', input.value.trim() !== '');
                    }
                });
            });
        }
        
        /**
         * Validasi single field
         * @param {HTMLElement} field - Input field yang akan divalidasi
         * @returns {boolean} - Apakah field valid
         */
        validateField(field) {
            // Clear previous validation states
            field.classList.remove('is-valid', 'is-invalid');
            
            const formGroup = field.closest('.form-group');
            if (!formGroup) return true;
            
            const feedback = formGroup.querySelector('.invalid-feedback');
            if (feedback) feedback.style.display = 'none';
            
            let isValid = true;
            let errorMessage = '';
            
            // Required validation
            if (field.hasAttribute('required') && !field.value.trim()) {
                isValid = false;
                errorMessage = field.getAttribute('data-required-message') || 'Field ini wajib diisi';
            }
            
            // Email validation
            else if (field.type === 'email' && field.value.trim()) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(field.value.trim())) {
                    isValid = false;
                    errorMessage = field.getAttribute('data-email-message') || 'Format email tidak valid';
                }
            }
            
            // Min length validation
            else if (field.hasAttribute('minlength')) {
                const minLength = parseInt(field.getAttribute('minlength'));
                if (field.value.length < minLength) {
                    isValid = false;
                    errorMessage = field.getAttribute('data-minlength-message') || `Minimal ${minLength} karakter`;
                }
            }
            
            // Max length validation
            else if (field.hasAttribute('maxlength')) {
                const maxLength = parseInt(field.getAttribute('maxlength'));
                if (field.value.length > maxLength) {
                    isValid = false;
                    errorMessage = field.getAttribute('data-maxlength-message') || `Maksimal ${maxLength} karakter`;
                }
            }
            
            // Pattern validation
            else if (field.hasAttribute('pattern')) {
                const pattern = new RegExp(field.getAttribute('pattern'));
                if (field.value.trim() && !pattern.test(field.value)) {
                    isValid = false;
                    errorMessage = field.getAttribute('data-pattern-message') || 'Format tidak sesuai';
                }
            }
            
            // Update field state
            if (!isValid) {
                field.classList.add('is-invalid');
                if (feedback) {
                    feedback.textContent = errorMessage;
                    feedback.style.display = 'block';
                }
                console.warn(`❌ Validation failed for ${field.name || field.id}: ${errorMessage}`);
            } else if (field.value.trim()) {
                field.classList.add('is-valid');
                console.log(`✅ Validation passed for ${field.name || field.id}`);
            }
            
            return isValid;
        }
        
        /**
         * Validasi seluruh form
         * @param {string|HTMLElement} form - Form ID atau element
         * @returns {boolean} - Apakah form valid
         */
        validateForm(form) {
            console.log(`🔍 Validating form: ${typeof form === 'string' ? form : 'custom element'}`);
            const formEl = typeof form === 'string' ? document.getElementById(form) : form;
            if (!formEl) {
                console.error('❌ Form element not found');
                return false;
            }
            
            let isValid = true;
            const fields = formEl.querySelectorAll('.ctrl-form[required]');
            
            fields.forEach(field => {
                if (!this.validateField(field)) {
                    isValid = false;
                }
            });
            
            console.log(isValid ? '✅ Form validation passed' : '❌ Form validation failed');
            return isValid;
        }
        
        /**
         * Reset form validation
         * @param {string|HTMLElement} form - Form ID atau element
         */
        resetFormValidation(form) {
            console.log(`🔄 Resetting validation for form: ${typeof form === 'string' ? form : 'custom element'}`);
            const formEl = typeof form === 'string' ? document.getElementById(form) : form;
            if (!formEl) {
                console.error('❌ Form element not found');
                return;
            }
            
            formEl.querySelectorAll('.ctrl-form').forEach(field => {
                field.classList.remove('is-valid', 'is-invalid');
            });
            
            formEl.querySelectorAll('.invalid-feedback, .valid-feedback').forEach(feedback => {
                feedback.style.display = 'none';
            });
        }
        
        /**
         * Get form data as object
         * @param {string|HTMLElement} form - Form ID atau element
         * @returns {Object} - Form data object
         */
        getFormData(form) {
            console.log(`📋 Getting form data from: ${typeof form === 'string' ? form : 'custom element'}`);
            const formEl = typeof form === 'string' ? document.getElementById(form) : form;
            if (!formEl) {
                console.error('❌ Form element not found');
                return {};
            }
            
            const data = {};
            const elements = formEl.querySelectorAll('.ctrl-form[name], input[name], select[name], textarea[name]');
            
            elements.forEach(element => {
                if (element.name) {
                    if (element.type === 'checkbox') {
                        data[element.name] = element.checked;
                    } else if (element.type === 'radio') {
                        if (element.checked) {
                            data[element.name] = element.value;
                        }
                    } else {
                        data[element.name] = element.value;
                    }
                }
            });
            
            console.log('📊 Form data retrieved:', data);
            return data;
        }
        
        /**
         * Set form data from object
         * @param {string|HTMLElement} form - Form ID atau element
         * @param {Object} data - Data object untuk di-set
         */
        setFormData(form, data) {
            console.log(`📝 Setting form data to: ${typeof form === 'string' ? form : 'custom element'}`, data);
            const formEl = typeof form === 'string' ? document.getElementById(form) : form;
            if (!formEl || !data) {
                console.error('❌ Form or data not provided');
                return;
            }
            
            Object.keys(data).forEach(key => {
                const element = formEl.querySelector(`[name="${key}"]`);
                if (!element) {
                    console.warn(`⚠️ Element with name "${key}" not found`);
                    return;
                }
                
                if (element.type === 'checkbox') {
                    element.checked = Boolean(data[key]);
                } else if (element.type === 'radio') {
                    const radio = formEl.querySelector(`[name="${key}"][value="${data[key]}"]`);
                    if (radio) radio.checked = true;
                } else {
                    element.value = data[key] || '';
                }
                
                // Trigger validation jika perlu
                this.validateField(element);
            });
            
            console.log('✅ Form data set successfully');
        }
    }
    
    /**
     * Initialize CtrlForm ketika DOM ready
     * @private
     */
    function initCtrlForm() {
        try {
            window.CtrlForm = new CtrlForm();
            
            // Make utility functions globally available
            window.validateForm = (form) => window.CtrlForm.validateForm(form);
            window.resetFormValidation = (form) => window.CtrlForm.resetFormValidation(form);
            window.getFormData = (form) => window.CtrlForm.getFormData(form);
            window.setFormData = (form, data) => window.CtrlForm.setFormData(form, data);
            
            console.log('🎉 CtrlForm v1.3 ready! Author: Ali Musthofa');
        } catch (error) {
            console.error('❌ CtrlForm initialization failed:', error);
        }
    }
    
    // Initialize ketika DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCtrlForm);
    } else {
        initCtrlForm();
    }
})();
