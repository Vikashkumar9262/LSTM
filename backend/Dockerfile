# Use a full Python runtime image to ensure all build dependencies are present
FROM python:3.11-bullseye

# Set the working directory in the container
WORKDIR /code

# Install system dependencies needed for TA-Lib
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    wget \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Download and install TA-Lib from source
RUN wget http://prdownloads.sourceforge.net/ta-lib/ta-lib-0.4.0-src.tar.gz && \
    tar -xvzf ta-lib-0.4.0-src.tar.gz && \
    cd ta-lib/ && \
    ./configure --prefix=/usr && \
    make && \
    make install && \
    cd .. && \
    rm -rf ta-lib*

# Set standard C compiler flags to find the TA-Lib headers and library.
# This is a more robust method than using package-specific ENV VARS.
ENV CFLAGS="-I/usr/include/ta-lib"
ENV LDFLAGS="-L/usr/lib"

# Copy the requirements file into the container
COPY ./requirements.txt /code/requirements.txt

# Install Python dependencies
# Upgrade pip and setuptools first for better compatibility
RUN pip install --no-cache-dir -U pip setuptools
# Now, install the requirements. The C compiler will use CFLAGS and LDFLAGS.
RUN pip install --no-cache-dir -r /code/requirements.txt

# Copy the rest of the backend application code into the container
COPY . /code

# Expose the port the app runs on (Render will use this)
EXPOSE 8000

# Define the command to run the app. Render will override this with its own start command,
# but it's good practice to have it. The PORT environment variable is set by Render.
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"] 