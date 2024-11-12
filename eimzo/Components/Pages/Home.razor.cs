namespace eimzo.Components.Pages;

public partial class Home
{
    [Inject] IJSRuntime jsRuntime { get; set; } = null!;
    [Inject] ISnackbar snackbar { get; set; } = null!;
    string key = string.Empty;
    string selectedKey = string.Empty;

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (firstRender)
        {
            await jsRuntime.InvokeVoidAsync("loadapp");
            await base.OnAfterRenderAsync(firstRender);
        }
    }

    public async Task SignIn()
    {
        try
        {
            CancellationTokenSource cts = new ();
            cts.CancelAfter(TimeSpan.FromMinutes(1));
            var json = await jsRuntime.InvokeAsync<string?>("signinImzo", cts.Token);
            if (json is not null)
            {
                var data = JsonConvert.DeserializeObject<Cert>(json);
                if (data is not null)
                {
                    key = data.result.pkcs7_64;
                    StateHasChanged();
                }
            }
            else if (cts.IsCancellationRequested)
            {
                snackbar.Add("Timeout!", Severity.Warning);
            }
        }
        catch (Exception ex)
        {
            snackbar.Add("Something Went Wrong!", Severity.Error);
            Console.WriteLine(ex.Message);
        }
    }
}