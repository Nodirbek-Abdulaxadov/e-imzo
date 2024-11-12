namespace eimzo.Models;

public class Cert
{
    public Result result { get; set; } = new();
    public string token { get; set; } = string.Empty;
}


public class Result
{
    public string pkcs7_64 { get; set; } = string.Empty;
    public string signer_serial_number { get; set; } = string.Empty;
    public string signature_hex { get; set; } = string.Empty;
    public bool success { get; set; }
}