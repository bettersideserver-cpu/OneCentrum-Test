import { supabase } from './supabase.js';

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const error = document.getElementById('error');

function showError(message) {
    if (error) error.textContent = message || '';
}

document.getElementById('showRegister')?.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    showError('');
});

document.getElementById('showLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
    showError('');
});

document.getElementById('registerBtn')?.addEventListener('click', async () => {
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;

    if (!name || !email || !password) {
        showError('Please fill all fields.');
        return;
    }

    try {
        const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name }
            }
        });

        if (signUpError) throw signUpError;

        // The SQL trigger creates the profile automatically.
        if (data.session) {
            window.location.href = 'admin.html';
        } else {
            alert('Registration successful. Check your email if confirmation is enabled, then log in.');
            registerForm.style.display = 'none';
            loginForm.style.display = 'block';
        }
    } catch (err) {
        showError(err.message || 'Registration failed.');
    } finally {
        window.setBtnLoading?.(document.getElementById('registerBtn'), false);
    }
});

document.getElementById('loginBtn')?.addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showError('Please fill all fields.');
        return;
    }

    try {
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (signInError) throw signInError;

        window.location.href = 'admin.html';
    } catch (err) {
        showError(err.message || 'Login failed.');
    } finally {
        window.setBtnLoading?.(document.getElementById('loginBtn'), false);
    }
});
