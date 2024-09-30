$(function () {
    console.log("App started");
    $('.news__card_grid').flickity({
        groupCells: true,
        imagesLoaded: true
    });

    $('.image__gallery_grid').flickity({
        cellAlign: 'left',
        contain: true,
        prevNextButtons: true,
        selectedAttraction: 0.3,
        friction: 0.8,
        imagesLoaded: true
    });

    $('.institute__inner_grid').flickity({
        cellAlign: 'left',
        contain: true,
        imagesLoaded: true
    })

    $('.theme__block_item').click(function () {
        $('.theme__block_item.is-toggle-active').removeClass('is-toggle-active');
        $(this).addClass('is-toggle-active');
        var id = $(this).attr('data-tab');
        $('.theme__block_single_content').removeClass('is-content-active');
        $(`.${id}`).addClass('is-content-active');
    })



    $(window).scroll(function () {
        if ($(this).scrollTop() > 150) {
            $('.header').addClass('active');
            $('.main_logo').addClass('active');
            $('.navbar .navbar-nav').addClass('active');
        } else {
            $('.main_logo').removeClass('active');
            $('.navbar .navbar-nav').removeClass('active');
            $('.header').removeClass('active');
        }
    })

    $('ul.navbar-nav li.dropdown').hover(function () {
        $(this).find('.dropdown-menu').stop(true, true).fadeIn(200);
    }, function () {
        $(this).find('.dropdown-menu').stop(true, true).fadeOut(200);
    });

    $(".menu-toggle").click(function (e) {
        e.preventDefault();
        $("#sidebar-wrapper").toggleClass("active");
        $(".menu-toggle > .fa-bars, .menu-toggle > .fa-times").toggleClass("fa-bars fa-times");
        $(this).toggleClass("active");
    });

    $('.sidebar-nav-item').click(function () {
        $(this).find('i').toggleClass('active');
    })

    // Closes responsive menu when a scroll trigger link is clicked
    // $('#sidebar-wrapper .js-scroll-trigger').click(function () {
    //     $("#sidebar-wrapper").removeClass("active");
    //     $(".menu-toggle").removeClass("active");
    //     $(".menu-toggle > .fa-bars, .menu-toggle > .fa-times").toggleClass("fa-bars fa-times");
    // });
});

document.getElementById("search-icon").addEventListener("click", function() {
    var searchBar = document.getElementById("search-bar");
    if (searchBar.style.display === "none") {
      searchBar.style.display = "inline-block"; // Show the search bar
      searchBar.focus(); // Focus the input field
    } else {
      searchBar.style.display = "none"; // Hide the search bar
    }
  });
  

// Global notification function
function showNotification(message, type = 'info') {
    const notificationDiv = document.createElement('div');
    notificationDiv.className = `notification ${type}`;
    notificationDiv.textContent = message;

    document.body.appendChild(notificationDiv);

    setTimeout(() => {
        notificationDiv.classList.add('show');
    }, 100); // Ensure the notification is added to the DOM

    setTimeout(() => {
        notificationDiv.classList.remove('show');
        notificationDiv.classList.add('hidden');
        setTimeout(() => notificationDiv.remove(), 500);
    }, 7000);
}

// Global variable to temporarily hold the token
let currentToken = null;
document.addEventListener('DOMContentLoaded', async function () {   
    // window.location.href = 'index.html'; // Redirect to the home section by default on page load
    // shiftSectionsAutomatically(); // Start shifting through sections automatically
    // await checkServerLoginStatus(); // Check if the user is logged in by making a server request
    
    document.getElementById('login-form')?.addEventListener('submit', async function (event) {
        console.log('Login form submitted'); // Debug log
        event.preventDefault();
    
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
    
        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });
    
            const data = await response.json();
            console.log('Response received:', data); // Debug log
    
            if (response.ok && data.success) {
                currentToken = data.token; 
                console.log('Token stored successfully:', currentToken); // Debug log
                showNotification(`Login successful! Welcome, ${data.username}.`, 'success');
    
                setTimeout(() => {
                    console.log('Redirecting to index.html'); // Debug log
                    window.location.href = '/index.html'; // Redirect to index.html
                }, 2000); // Redirect after 2 seconds
    
                document.getElementById('login-email').value = '';
                document.getElementById('login-password').value = '';
            } else {
                showNotification(data.message || 'Invalid username or password. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('There was an error with your login. Please try again.', 'error');
        }
    });
    
// Function to check login status
async function checkServerLoginStatus() {
    try {
        const response = await fetch('/check-token', {
            method: 'GET',
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            // If token is valid
            if (data.valid) {
                showNotification(`Welcome back, ${data.username}!`, 'success');

                // Hide Register and Login, show Logout
                document.getElementById('registerItem').style.display = 'none'; // Hide Register
                document.getElementById('loginItem').style.display = 'none'; // Hide Login
                document.getElementById('logoutItem').style.display = 'inline-block'; // Show Logout
            } else {
                // Show Register and Login, hide Logout if token is invalid
                document.getElementById('registerItem').style.display = 'inline-block'; // Show Register
                document.getElementById('loginItem').style.display = 'inline-block'; // Show Login
                document.getElementById('logoutItem').style.display = 'none'; // Hide Logout
            }
        } else {
            console.error('Failed to check login status:', response.status);
            // Show Register and Login, hide Logout if there's an error
            document.getElementById('registerItem').style.display = 'inline-block';
            document.getElementById('loginItem').style.display = 'inline-block';
            document.getElementById('logoutItem').style.display = 'none'; // Hide Logout
        }
    } catch (error) {
        console.error('Error checking token:', error);
        // Show Register and Login, hide Logout if an error occurs
        document.getElementById('registerItem').style.display = 'inline-block';
        document.getElementById('loginItem').style.display = 'inline-block';
        document.getElementById('logoutItem').style.display = 'none'; // Hide Logout
    }
}

// Call this function when the page loads
document.addEventListener('DOMContentLoaded', checkServerLoginStatus);


   // Event listener for logout
document.getElementById('logout-link')?.addEventListener('click', async function (event) {
    event.preventDefault();

    if (!currentToken) {
        showNotification('You are not logged in.', 'error');
        return;
    }

    // Show loading indicator
    showLoadingIndicator(true); // Custom function to show loading state

    try {
        const response = await fetch('/logout', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` } // Include the token in the header
        });

        if (response.ok) {
            showNotification('You have been logged out.', 'success');
            currentToken = null; // Clear the token after logout
            window.location.href = 'login.html'; // Redirect to login page
        } else {
            const data = await response.json();
            showNotification(data.message || 'Logout failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error during logout:', error);
        showNotification('There was an issue logging out. Please try again.', 'error');
    } finally {
        // Hide loading indicator
        showLoadingIndicator(false); // Custom function to hide loading state
    }
});

// Example functions for showing/hiding loading state
function showLoadingIndicator(isLoading) {
    const loader = document.getElementById('loader'); // Assume you have a loader element
    loader.style.display = isLoading ? 'block' : 'none';
}

// Function to check login status
async function checkServerLoginStatus() {
    showLoadingIndicator(true); // Show loading indicator

    try {
        const response = await fetch('/check-token', {
            method: 'GET',
            credentials: 'include' 
        });

        if (response.ok) {
            const data = await response.json();
            // If token is valid
            if (data.valid) {
                showNotification(`Welcome back, ${data.username}!`, 'success');
                // Hide Register and Login, show Logout
                document.getElementById('registerItem').style.display = 'none'; // Hide Register
                document.getElementById('loginItem').style.display = 'none'; // Hide Login
                document.getElementById('logoutItem').style.display = 'inline-block'; // Show Logout
                window.location.href = 'index.html'; // Redirect to home
            } else {
                // Show Register and Login, hide Logout if token is invalid
                document.getElementById('registerItem').style.display = 'inline-block';
                document.getElementById('loginItem').style.display = 'inline-block';
                document.getElementById('logoutItem').style.display = 'none'; // Hide Logout
                window.location.href = 'login.html'; // Redirect to login
            }
        } else {
            console.error('Failed to check login status:', response.status);
            // Show Register and Login, hide Logout if there's an error
            document.getElementById('registerItem').style.display = 'inline-block';
            document.getElementById('loginItem').style.display = 'inline-block';
            document.getElementById('logoutItem').style.display = 'none'; // Hide Logout
            window.location.href = 'login.html'; // Redirect to login
        }
    } catch (error) {
        console.error('Error checking token:', error);
        // Show Register and Login, hide Logout if an error occurs
        document.getElementById('registerItem').style.display = 'inline-block';
        document.getElementById('loginItem').style.display = 'inline-block';
        document.getElementById('logoutItem').style.display = 'none'; // Hide Logout
    } finally {
        showLoadingIndicator(false); // Hide loading indicator
    }
}

// Call this function when the page loads
document.addEventListener('DOMContentLoaded', checkServerLoginStatus);

// Re-Authentication
document.getElementById('reauth-form')?.addEventListener('submit', async function (event) {
    event.preventDefault();

    const email = document.getElementById('reauth-email').value;
    const password = document.getElementById('reauth-password').value;

    // Optional: Clear previous error messages
    clearErrorMessages();

    showLoadingIndicator(true); // Show loading indicator

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showNotification('Re-authentication successful!', 'success');
            window.location.href = 'index.html'; // Redirect to home after re-authentication
        } else {
            const errorMessage = data.message || 'Re-authentication failed. Please try again.';
            showNotification(errorMessage, 'error');
        }
    } catch (error) {
        console.error('Error during re-authentication:', error);
        showNotification('There was an error during re-authentication. Please try again.', 'error');
    } finally {
        showLoadingIndicator(false); // Hide loading indicator
    }
});

// Example function to show/hide loading state
function showLoadingIndicator(isLoading) {
    const loader = document.getElementById('loader'); // Assume you have a loader element
    loader.style.display = isLoading ? 'block' : 'none';
}

// Example function to clear previous error messages
function clearErrorMessages() {
    // Clear any displayed error messages in your UI
}


// Event listener for register form submission
document.getElementById('register-form')?.addEventListener('submit', async function (event) {
    event.preventDefault();
    console.log("Registration form submitted");

    // Collect form values
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validate form fields
    if (!name || !email || !password || !confirmPassword) {
        showNotification('Please fill in all fields.', 'error');
        return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
        showNotification('Passwords do not match.', 'error');
        return;
    }

    try {
        // Submit form data to the server
        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username: name, email, password }),
        });

        const data = await response.json(); // Get response data
        console.log('Server Response:', data); // Debugging line

        // Handle the response from the server
        if (response.ok) {
            showNotification('Registration successful!', 'success');
            document.getElementById('register-form').reset(); // Clear form fields
            window.location.href = '#personalDetails'; // Redirect to personalDetails after successful registration
            showSection('personalDetails'); // Show the personal details section
        } else {
            showNotification(data.message || 'Registration failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('There was an error with your registration. Please try again.', 'error');
    }
});

// Function to show specific sections
function showSection(sectionId) {
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        section.classList.add('hidden'); // Hide all sections
    });
    const activeSection = document.getElementById(sectionId);
    if (activeSection) {
        activeSection.classList.remove('hidden'); // Show the active section
    }
}


// Add this script to your existing JavaScript file or in a <script> tag
document.getElementById('logoutButton').addEventListener('click', async function(event) {
    event.preventDefault(); // Prevent the default anchor behavior

    try {
        // Send a request to the server to delete the token
        const response = await fetch('/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken || ''}`, // Include the current token
            },
        });

        if (response.ok) {
    
            localStorage.removeItem('token'); // Adjust according to where you store the token
            // Redirect to the login page or show a success message
            window.location.href = 'login.html'; // Redirect to login page
        } else {
            const data = await response.json();
            throw new Error(data.message || 'Logout failed');
        }
    } catch (error) {
        console.error('Logout Error:', error);
        alert('There was an error logging out. Please try again.'); // Show an error message
    }
});


   // Handle form submission for personal details
const personalDetailsForm = document.getElementById('personalDetailsForm');
if (personalDetailsForm) {
    personalDetailsForm.addEventListener('submit', async function (event) {
        event.preventDefault(); // Prevent the default form submission behavior

        // Collect form values
        const name = document.getElementById('fullName').value;
        const email = document.getElementById('email').value;
        const phone_number = document.getElementById('phone').value;
        const address = document.getElementById('address').value;
        const cv = document.getElementById('cvUpload').value;

        // Disable the form to prevent multiple submissions
        personalDetailsForm.querySelector('button[type="submit"]').disabled = true;

        try {
            // Submit form data to the server
            const response = await fetch('/personalDetails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentToken || ''}`, // Include token if available
                },
                body: JSON.stringify({
                    name,
                    email,
                    phone_number,
                    address,
                    cv,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                showNotification(`Thank you ${name}, your personal information has been saved successfully!`, 'success');
                
                // Reset the form
                personalDetailsForm.reset();

                // Automatically navigate to the next page after successful submission
                window.location.href = 'nextPage.html'; 
            } else {
                throw new Error(data.message || 'An error occurred during submission.'); // Handle server-side errors
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('There was an error with your submission. Please try again.', 'error');
        } finally {
            // Re-enable the submit button regardless of success or failure
            personalDetailsForm.querySelector('button[type="submit"]').disabled = false;
        }
    });
}

// Handle skip button click
const skipButton = document.getElementById('skipButton');
if (skipButton) {
    skipButton.addEventListener('click', function () {
        // Navigate to the next page or perform any other action
        window.location.href = 'index.html';
    });
}



    // Handle form submission for enquiries
document.getElementById('enquiry-form')?.addEventListener('submit', async function (event) {
    event.preventDefault(); // Prevent the default form submission behavior

    // Get form values
    const email = document.getElementById('enquiry-email').value; // Email address
    const message = document.getElementById('enquiry-message').value; // User's message

    try {
        // Send a POST request with enquiry data
        const response = await fetch('/enquiries', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json', // Specify the content type
            },
            body: JSON.stringify({ email, message }), // Payload with email and message
        });

        // Check for a successful response
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server Error:', errorText); // Log error for debugging
            throw new Error(errorText || 'Network response was not ok'); // Handle response error
        }

        // Process the response
        const result = await response.json(); // Get the result in JSON format
        showNotification(`Thank you! Your enquiry has been submitted.`, 'success'); // Notify user of success
        document.getElementById('enquiry-form').reset(); // Reset the form after submission
    } catch (error) {
        console.error('Error:', error); // Log the error
        showNotification('There was an error with your enquiry. Please try again.', 'error'); // Notify user of failure
    }
});
});